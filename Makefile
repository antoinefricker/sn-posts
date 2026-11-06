.PHONY: stop

# Shut down the local Supabase stack (database, auth, edge functions)
stop:
	npx supabase stop
