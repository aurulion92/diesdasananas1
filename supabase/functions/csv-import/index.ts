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

    // Prepare all building records for upsert
    const upsertData = buildings.map(building => ({
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
    }))

    console.log(`Prepared ${upsertData.length} records for upsert`)

    // Batch upsert using ON CONFLICT (street, house_number, city)
    // This is much faster than checking each record individually
    const BATCH_SIZE = 1000
    
    for (let i = 0; i < upsertData.length; i += BATCH_SIZE) {
      const batch = upsertData.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(upsertData.length / BATCH_SIZE)
      
      console.log(`Processing batch ${batchNum}/${totalBatches} (${batch.length} records)`)

      // Use upsert with onConflict - PostgreSQL handles the merge
      // ignoreDuplicates: false means it will UPDATE on conflict
      const { data: upsertedData, error: upsertError } = await supabase
        .from('buildings')
        .upsert(batch, {
          onConflict: 'street,house_number,city',
          ignoreDuplicates: false, // Update on conflict
        })
        .select('id')

      if (upsertError) {
        console.error(`Batch ${batchNum} error:`, upsertError)
        if (result.errors.length < 10) {
          result.errors.push(`Batch ${batchNum}: ${upsertError.message}`)
        }
      } else {
        // Count as created (upsert doesn't distinguish, but we count all processed)
        result.created += batch.length
        console.log(`Batch ${batchNum} complete: ${batch.length} records processed`)
      }
    }

    // Note: With upsert, we can't easily distinguish created vs updated
    // We report all as "created" but they may be updates
    console.log(`Import complete: ${result.created} records processed`)

    // Update import log with results
    const { error: updateLogError } = await supabase
      .from('csv_import_logs')
      .update({
        records_created: result.created,
        records_updated: 0, // With upsert we can't distinguish
        records_skipped: result.skipped,
        errors: result.errors.length > 0 ? result.errors : null,
      })
      .eq('id', batchId)

    if (updateLogError) {
      console.error('Failed to update import log:', updateLogError)
    }

    console.log('Import finished:', result)

    return new Response(
      JSON.stringify({
        success: true,
        processed: result.created,
        created: result.created,
        updated: 0,
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
