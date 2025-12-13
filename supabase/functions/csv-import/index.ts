import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BuildingData {
  street: string
  house_number: string
  city: string
  postal_code?: string
  residential_units?: number
  ausbau_art?: string
  ausbau_status?: string
  tiefbau_done?: boolean
  apl_set?: boolean
  kabel_tv_available?: boolean
  gebaeude_id_v2?: string
  gebaeude_id_k7?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { buildings, fileName } = await req.json() as { 
      buildings: BuildingData[], 
      fileName?: string 
    }

    if (!buildings || !Array.isArray(buildings)) {
      return new Response(
        JSON.stringify({ error: 'Invalid buildings data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`CSV Import started: ${buildings.length} buildings`)

    // Create import log entry
    const { data: logEntry, error: logError } = await supabase
      .from('csv_import_logs')
      .insert({
        import_type: 'buildings',
        file_name: fileName || 'edge_function_upload',
        records_processed: buildings.length,
      })
      .select('id')
      .single()

    if (logError) {
      console.error('Log entry error:', logError)
      return new Response(
        JSON.stringify({ error: 'Failed to create import log' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const batchId = logEntry.id
    const result = { created: 0, updated: 0, skipped: 0, errors: [] as string[], batchId }
    const affectedIds: string[] = []
    const previousStates: any[] = []

    // Get all existing buildings in one query using a clever approach
    // We'll fetch all buildings and create a lookup map
    const { data: existingBuildings, error: fetchError } = await supabase
      .from('buildings')
      .select('*')

    if (fetchError) {
      console.error('Fetch error:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch existing buildings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create lookup map
    const existingMap = new Map<string, any>()
    for (const b of existingBuildings || []) {
      const key = `${b.street?.toLowerCase()}|${b.house_number?.toLowerCase()}|${b.city?.toLowerCase() || 'falkensee'}`
      existingMap.set(key, b)
    }

    console.log(`Existing buildings loaded: ${existingMap.size}`)

    // Separate into inserts and updates
    const toInsert: any[] = []
    const toUpdate: { data: any, id: string, previous: any }[] = []

    for (const building of buildings) {
      const key = `${building.street?.toLowerCase()}|${building.house_number?.toLowerCase()}|${(building.city || 'Falkensee')?.toLowerCase()}`
      const existing = existingMap.get(key)

      if (existing) {
        if (existing.manual_override_active) {
          result.skipped++
        } else {
          toUpdate.push({
            data: {
              street: building.street,
              house_number: building.house_number,
              city: building.city || 'Falkensee',
              postal_code: building.postal_code || null,
              residential_units: building.residential_units || 1,
              ausbau_art: building.ausbau_art || null,
              ausbau_status: building.ausbau_status || 'geplant',
              tiefbau_done: building.tiefbau_done || false,
              apl_set: building.apl_set || false,
              kabel_tv_available: building.kabel_tv_available || false,
              gebaeude_id_v2: building.gebaeude_id_v2 || null,
              gebaeude_id_k7: building.gebaeude_id_k7 || null,
              original_csv_data: building,
              last_import_batch_id: batchId,
            },
            id: existing.id,
            previous: existing
          })
          previousStates.push({ id: existing.id, type: 'update', previous: existing })
          affectedIds.push(existing.id)
        }
      } else {
        toInsert.push({
          street: building.street,
          house_number: building.house_number,
          city: building.city || 'Falkensee',
          postal_code: building.postal_code || null,
          residential_units: building.residential_units || 1,
          ausbau_art: building.ausbau_art || null,
          ausbau_status: building.ausbau_status || 'geplant',
          tiefbau_done: building.tiefbau_done || false,
          apl_set: building.apl_set || false,
          kabel_tv_available: building.kabel_tv_available || false,
          gebaeude_id_v2: building.gebaeude_id_v2 || null,
          gebaeude_id_k7: building.gebaeude_id_k7 || null,
          is_manual_entry: false,
          original_csv_data: building,
          last_import_batch_id: batchId,
        })
      }
    }

    console.log(`To insert: ${toInsert.length}, To update: ${toUpdate.length}`)

    // Batch insert all new buildings at once (up to 1000 at a time for safety)
    const BATCH_SIZE = 1000
    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
      const batch = toInsert.slice(i, i + BATCH_SIZE)
      const { data: insertedBuildings, error: insertError } = await supabase
        .from('buildings')
        .insert(batch)
        .select('id')

      if (insertError) {
        console.error('Insert error:', insertError)
        result.errors.push(`Insert batch ${i}-${i + batch.length}: ${insertError.message}`)
      } else {
        result.created += batch.length
        if (insertedBuildings) {
          for (const b of insertedBuildings) {
            previousStates.push({ id: b.id, type: 'create', previous: null })
            affectedIds.push(b.id)
          }
        }
      }
    }

    console.log(`Inserts complete: ${result.created}`)

    // Batch update all existing buildings using bulk upserts by ID
    for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
      const batch = toUpdate.slice(i, i + BATCH_SIZE)

      const payload = batch.map(item => ({
        id: item.id,
        ...item.data,
      }))

      const { error: updateError } = await supabase
        .from('buildings')
        .upsert(payload)

      if (updateError) {
        console.error('Update batch error:', updateError)
        if (result.errors.length < 10) {
          result.errors.push(`Update batch ${i}-${i + batch.length}: ${updateError.message}`)
        }
      } else {
        result.updated += batch.length
      }
    }

    console.log(`Updates complete: ${result.updated}`)

    // Update import log with results
    await supabase
      .from('csv_import_logs')
      .update({
        records_created: result.created,
        records_updated: result.updated,
        records_skipped: result.skipped,
        errors: result.errors.length > 0 ? result.errors : null,
        previous_states: previousStates,
        affected_building_ids: affectedIds,
      })
      .eq('id', batchId)

    console.log('Import complete:', result)

    return new Response(
      JSON.stringify({
        success: true,
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        errors: result.errors,
        batchId: result.batchId,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error: unknown) {
    console.error('Import error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
