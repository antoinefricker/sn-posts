import { supabase } from '@/supabase'
import type { CampaignTemplate, TemplateConfig, TemplateType } from './types'

const TEMPLATE_COLUMNS = 'id, campaign_id, type, position, config, created_at, updated_at'

const UNIQUE_VIOLATION = '23505'

export async function listTemplates(campaignId: string): Promise<CampaignTemplate[]> {
  const { data, error } = await supabase
    .from('campaign_templates')
    .select(TEMPLATE_COLUMNS)
    .eq('campaign_id', campaignId)
    .order('position', { ascending: true })
    .overrideTypes<CampaignTemplate[], { merge: false }>()
  if (error) throw error
  return data
}

async function insertAtEnd(
  campaignId: string,
  type: TemplateType,
  config: TemplateConfig,
): Promise<{ template: CampaignTemplate | null; code: string | null; error: Error | null }> {
  const { data: last, error: maxError } = await supabase
    .from('campaign_templates')
    .select('position')
    .eq('campaign_id', campaignId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle<{ position: number }>()
  if (maxError) throw maxError
  const position = (last?.position ?? 0) + 1
  const { data, error } = await supabase
    .from('campaign_templates')
    .insert({ campaign_id: campaignId, type, config, position })
    .select(TEMPLATE_COLUMNS)
    .single<CampaignTemplate>()
  if (error) return { template: null, code: error.code, error }
  return { template: data, code: null, error: null }
}

export async function createTemplate(
  campaignId: string,
  type: TemplateType,
  config: TemplateConfig,
): Promise<CampaignTemplate> {
  let result = await insertAtEnd(campaignId, type, config)
  if (result.code === UNIQUE_VIOLATION) result = await insertAtEnd(campaignId, type, config)
  if (result.error || !result.template) throw result.error
  return result.template
}

export async function updateTemplate(id: string, config: TemplateConfig): Promise<void> {
  const { error } = await supabase.from('campaign_templates').update({ config }).eq('id', id)
  if (error) throw error
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('campaign_templates').delete().eq('id', id)
  if (error) throw error
}

export async function reorderTemplates(campaignId: string, orderedIds: string[]): Promise<void> {
  const { error } = await supabase.rpc('reorder_campaign_templates', {
    p_campaign_id: campaignId,
    p_ids: orderedIds,
  })
  if (error) throw error
}
