.PHONY: start status stop db-reset link db-push deploy-function shadcn-add

# Start the local Supabase stack (incl. edge functions) and apply migrations
start:
	npx supabase start

# Show the local API URL and publishable key
status:
	npx supabase status

# Shut down the local Supabase stack (database, auth, edge functions)
stop:
	npx supabase stop

# Rebuild the local database (reopens sign-up for a new first admin)
db-reset:
	npx supabase db reset

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
