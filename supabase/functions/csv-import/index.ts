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
  gnv_vorhanden?: boolean
  gebaeude_id_v2?: string
  gebaeude_id_k7?: string
  cluster?: string
  dslam_name?: string
  dslam_port_number?: number
  dslam_ports_occupied?: number
  dslam_ports_available?: number
}

interface ImportSettings {
  update_mode: 'only_empty' | 'overwrite'
  overwrite_fields: string[]
  overwrite_manual_changes: boolean
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

    const { buildings, fileName, settings } = await req.json() as { 
      buildings: BuildingData[], 
      fileName?: string,
      settings?: ImportSettings
    }

    // Default settings if not provided
    const importSettings: ImportSettings = {
      update_mode: settings?.update_mode || 'overwrite',
      overwrite_fields: settings?.overwrite_fields || [],
      overwrite_manual_changes: settings?.overwrite_manual_changes || false
    }

    if (!buildings || !Array.isArray(buildings)) {
      return new Response(
        JSON.stringify({ error: 'Invalid buildings data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`CSV Import started: ${buildings.length} buildings, mode: ${importSettings.update_mode}`)

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

    // Build a map of DSLAM names to IDs
    const dslamMap = new Map<string, string>()
    const { data: dslams } = await supabase.from('dslams').select('id, name')
    if (dslams) {
      for (const dslam of dslams) {
        dslamMap.set(dslam.name.toLowerCase().trim(), dslam.id)
      }
    }
    console.log(`Found ${dslamMap.size} DSLAMs`)

    // Get all existing buildings to check for manual overrides and existing values
    const existingBuildingsMap = new Map<string, any>()
    
    // Fetch existing buildings in batches
    const FETCH_BATCH = 1000
    for (let i = 0; i < buildings.length; i += FETCH_BATCH) {
      const batch = buildings.slice(i, i + FETCH_BATCH)
      const conditions = batch.map(b => 
        `and(street.ilike.${encodeURIComponent(b.street.trim())},house_number.ilike.${encodeURIComponent(b.house_number.trim())},city.ilike.${encodeURIComponent((b.city || 'Falkensee').trim())})`
      ).join(',')
      
      const { data: existingData } = await supabase
        .from('buildings')
        .select('*')
        .or(conditions)
      
      if (existingData) {
        for (const existing of existingData) {
          const key = `${existing.street.trim().toLowerCase()}|${existing.house_number.trim().toLowerCase()}|${existing.city.trim().toLowerCase()}`
          existingBuildingsMap.set(key, existing)
        }
      }
    }

    console.log(`Found ${existingBuildingsMap.size} existing buildings`)

    // Prepare all building records for upsert
    const rawUpsertData = buildings.map((building) => {
      const key = `${building.street.trim().toLowerCase()}|${building.house_number.trim().toLowerCase()}|${(building.city || 'Falkensee').trim().toLowerCase()}`
      const existing = existingBuildingsMap.get(key)
      
      // Check if building has manual override and we should skip it
      if (existing?.manual_override_active && !importSettings.overwrite_manual_changes) {
        result.skipped++
        return null
      }

      // For NEW buildings: EFH with 1 WE automatically gets kabel_tv = true
      const residentialUnits = building.residential_units || 1
      const isEFH = residentialUnits === 1
      const defaultKabelTv = isEFH ? true : (building.kabel_tv_available || false)
      
      // For NEW buildings: set tariff availability based on ausbau_status
      const isAbgeschlossen = (building.ausbau_status || 'geplant') === 'abgeschlossen'
      const defaultPkTariffs = isAbgeschlossen
      const defaultKmuTariffs = isAbgeschlossen

      // Resolve DSLAM name to ID
      let dslamId = existing?.dslam_id || null
      if (building.dslam_name) {
        const resolvedId = dslamMap.get(building.dslam_name.toLowerCase().trim())
        if (resolvedId) {
          dslamId = resolvedId
        }
      }

      // Helper function to determine field value based on settings
      const getFieldValue = (fieldName: string, newValue: any, existingValue: any, defaultValue: any) => {
        // If no existing building, use new value or default
        if (!existing) {
          return newValue !== undefined ? newValue : defaultValue
        }

        // If field is not in overwrite_fields, keep existing value
        if (importSettings.update_mode === 'overwrite' && !importSettings.overwrite_fields.includes(fieldName)) {
          return existingValue
        }

        // "only_empty" mode: only fill if existing value is null/undefined/empty
        if (importSettings.update_mode === 'only_empty') {
          if (existingValue === null || existingValue === undefined || existingValue === '') {
            return newValue !== undefined ? newValue : defaultValue
          }
          return existingValue
        }

        // "overwrite" mode with field in overwrite_fields: use new value
        return newValue !== undefined ? newValue : existingValue
      }
      
      return {
        street: building.street,
        house_number: building.house_number,
        city: building.city || 'Falkensee',
        postal_code: getFieldValue('postal_code', building.postal_code, existing?.postal_code, null),
        residential_units: getFieldValue('residential_units', building.residential_units, existing?.residential_units, 1),
        cluster: getFieldValue('cluster', building.cluster, existing?.cluster, null),
        ausbau_art: getFieldValue('ausbau_art', building.ausbau_art, existing?.ausbau_art, null),
        ausbau_status: getFieldValue('ausbau_status', building.ausbau_status, existing?.ausbau_status, 'geplant'),
        tiefbau_done: getFieldValue('tiefbau_done', building.tiefbau_done, existing?.tiefbau_done, false),
        apl_set: getFieldValue('apl_set', building.apl_set, existing?.apl_set, false),
        // Protected fields - never overwrite from CSV unless explicitly in overwrite_fields
        kabel_tv_available: getFieldValue('kabel_tv_available', building.kabel_tv_available, existing?.kabel_tv_available, defaultKabelTv),
        pk_tariffs_available: existing ? existing.pk_tariffs_available : defaultPkTariffs,
        kmu_tariffs_available: existing ? existing.kmu_tariffs_available : defaultKmuTariffs,
        gnv_vorhanden: getFieldValue('gnv_vorhanden', building.gnv_vorhanden, existing?.gnv_vorhanden, false),
        gebaeude_id_v2: getFieldValue('gebaeude_id_v2', building.gebaeude_id_v2, existing?.gebaeude_id_v2, null),
        gebaeude_id_k7: getFieldValue('gebaeude_id_k7', building.gebaeude_id_k7, existing?.gebaeude_id_k7, null),
        // DSLAM fields
        dslam_id: dslamId,
        dslam_port_number: getFieldValue('dslam_port_number', building.dslam_port_number, existing?.dslam_port_number, null),
        dslam_ports_occupied: getFieldValue('dslam_ports_occupied', building.dslam_ports_occupied, existing?.dslam_ports_occupied, null),
        dslam_ports_available: getFieldValue('dslam_ports_available', building.dslam_ports_available, existing?.dslam_ports_available, null),
        is_manual_entry: false,
        original_csv_data: building,
        last_import_batch_id: batchId,
      }
    }).filter(Boolean)

    console.log(`Received ${buildings.length} raw building records, ${rawUpsertData.length} after filtering`)

    // Deduplicate by (street, house_number, city) to avoid ON CONFLICT errors
    const dedupedMap = new Map<string, any>()
    for (const record of rawUpsertData) {
      if (!record) continue
      const key = `${record.street.trim().toLowerCase()}|${record.house_number
        .trim()
        .toLowerCase()}|${record.city.trim().toLowerCase()}`
      dedupedMap.set(key, record)
    }

    const upsertData = Array.from(dedupedMap.values())

    console.log(
      `Prepared ${upsertData.length} unique records for upsert after deduplication`
    )

    // Batch upsert using ON CONFLICT (street, house_number, city)
    const BATCH_SIZE = 1000
    
    for (let i = 0; i < upsertData.length; i += BATCH_SIZE) {
      const batch = upsertData.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(upsertData.length / BATCH_SIZE)
      
      console.log(`Processing batch ${batchNum}/${totalBatches} (${batch.length} records)`)

      const { data: upsertedData, error: upsertError } = await supabase
        .from('buildings')
        .upsert(batch, {
          onConflict: 'street,house_number,city',
          ignoreDuplicates: false,
        })
        .select('id')

      if (upsertError) {
        console.error(`Batch ${batchNum} error:`, upsertError)
        if (result.errors.length < 10) {
          result.errors.push(`Batch ${batchNum}: ${upsertError.message}`)
        }
      } else {
        result.created += batch.length
        console.log(`Batch ${batchNum} complete: ${batch.length} records processed`)
      }
    }

    console.log(`Import complete: ${result.created} records processed, ${result.skipped} skipped`)

    // Update import log with results
    const { error: updateLogError } = await supabase
      .from('csv_import_logs')
      .update({
        records_created: result.created,
        records_updated: 0,
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
