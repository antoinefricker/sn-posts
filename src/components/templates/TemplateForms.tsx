import { FormField } from '@/components/FormField'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import type { FocusConfig, GamesConfig, GamesVenue, IntroConfig, TemplateConfig, TemplateType } from '@/data/types'
import {
  BADGE_MAX_LENGTH,
  FOCUS_TITLE_MAX_LENGTH,
  INTRO_SUBTITLE_MAX_LENGTH,
  INTRO_TITLE_MAX_LENGTH,
} from '@/lib/templates'
import { ImagePicker } from './ImagePicker'

type FieldsProps = { type: TemplateType; config: TemplateConfig; onChange: (config: TemplateConfig) => void; busy: boolean }

/** Per-type fields. Validation happens on submit, in the dialog. */
export function TemplateFields({ type, config, onChange, busy }: FieldsProps) {
  switch (type) {
    case 'intro': {
      const c = config as IntroConfig
      return (
        <>
          <FormField
            label="Title"
            name="template_title"
            value={c.title}
            maxLength={INTRO_TITLE_MAX_LENGTH}
            onChange={(e) => onChange({ ...c, title: e.target.value })}
            disabled={busy}
            required
            autoFocus
          />
          <FormField
            label="Subtitle"
            name="template_subtitle"
            value={c.subtitle}
            maxLength={INTRO_SUBTITLE_MAX_LENGTH}
            onChange={(e) => onChange({ ...c, subtitle: e.target.value })}
            disabled={busy}
          />
          <div className="grid gap-2">
            <Label>Background image</Label>
            <ImagePicker value={c.background_path} onChange={(p) => onChange({ ...c, background_path: p })} disabled={busy} />
          </div>
        </>
      )
    }
    case 'focus': {
      const c = config as FocusConfig
      return (
        <>
          <FormField
            label="Badge"
            name="template_badge"
            value={c.badge}
            maxLength={BADGE_MAX_LENGTH}
            onChange={(e) => onChange({ ...c, badge: e.target.value })}
            disabled={busy}
            required
            autoFocus
          />
          <FormField
            label="Title"
            name="template_title"
            value={c.title}
            maxLength={FOCUS_TITLE_MAX_LENGTH}
            onChange={(e) => onChange({ ...c, title: e.target.value })}
            disabled={busy}
            required
          />
          <div className="grid gap-2">
            <Label>Image</Label>
            <ImagePicker value={c.image_path} onChange={(p) => onChange({ ...c, image_path: p })} disabled={busy} />
          </div>
        </>
      )
    }
    case 'games': {
      const c = config as GamesConfig
      return (
        <div className="grid gap-2">
          <Label htmlFor="field-template_venue">Venue</Label>
          <NativeSelect
            id="field-template_venue"
            name="template_venue"
            value={c.venue}
            onChange={(e) => onChange({ venue: e.target.value as GamesVenue })}
            disabled={busy}
          >
            <option value="home">Home</option>
            <option value="away">Away</option>
          </NativeSelect>
        </div>
      )
    }
  }
}
