.PHONY: start stop build preview lint supabase-start supabase-status supabase-stop db-reset db-test link db-push deploy-function shadcn-add

# Start the dev server with HMR
start:
	npm run dev

# Stop the dev server started by `make start` / `npm run dev`
stop:
	@pkill -f "$(CURDIR)/node_modules/.bin/vite" && echo "Dev server stopped" || echo "No dev server running"

# Type-check and build to dist/
build:
	npm run build

# Serve the production build locally
preview:
	npm run preview

# Lint with Oxlint
lint:
	npm run lint

# Start the local Supabase stack (incl. edge functions) and apply migrations
supabase-start:
	npx supabase start

# Show the local API URL and publishable key
supabase-status:
	npx supabase status

# Shut down the local Supabase stack (database, auth, edge functions)
supabase-stop:
	npx supabase stop

# Rebuild the local database (reopens sign-up for a new first admin)
db-reset:
	npx supabase db reset

# Run the pgTAP database tests
db-test:
	npx supabase test db

# Link this folder to a cloud Supabase project
link:
	npx supabase link

# Apply migrations to the linked cloud project
db-push:
	npx supabase db push

# Deploy the create-user edge function to the linked cloud project
deploy-function:
	npx supabase functions deploy create-user

# Add a shadcn/ui component: make shadcn-add c=button
shadcn-add:
	@test -n "$(c)" || (echo "Usage: make shadcn-add c=<component>" && exit 1)
	npx shadcn@latest add $(c)
