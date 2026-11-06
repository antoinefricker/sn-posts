import { useParams } from 'react-router'

export function ProjectDetailPage() {
  const { projectId } = useParams()
  return (
    <div>
      <h1 className="text-2xl font-semibold">Project</h1>
      <p className="text-sm text-muted-foreground">{projectId}</p>
    </div>
  )
}
