CREATE INDEX "login_attempts_created_at_idx" ON "login_attempts" USING btree ("created_at");--> statement-breakpoint
CREATE FUNCTION public.consume_rate_limit_attempt(
	p_identity_hash text,
	p_window_start timestamp with time zone,
	p_max_attempts integer,
	p_retention_cutoff timestamp with time zone
)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $function$
DECLARE
	v_recent_attempts integer;
BEGIN
	IF p_identity_hash IS NULL
		OR p_identity_hash = ''
		OR pg_catalog.octet_length(p_identity_hash) > 500 THEN
		RAISE EXCEPTION 'Invalid rate-limit identity.' USING ERRCODE = '22023';
	END IF;

	IF p_window_start IS NULL
		OR p_retention_cutoff IS NULL
		OR p_retention_cutoff > p_window_start THEN
		RAISE EXCEPTION 'Invalid rate-limit window.' USING ERRCODE = '22023';
	END IF;

	IF p_max_attempts IS NULL
		OR p_max_attempts < 1
		OR p_max_attempts > 1000000 THEN
		RAISE EXCEPTION 'Invalid rate-limit maximum.' USING ERRCODE = '22023';
	END IF;

	PERFORM pg_catalog.pg_advisory_xact_lock(
		pg_catalog.hashtextextended(p_identity_hash, 0)
	);

	SELECT pg_catalog.count(*)::integer
	INTO v_recent_attempts
	FROM public.login_attempts
	WHERE "ip" = p_identity_hash
		AND "created_at" > p_window_start;

	IF v_recent_attempts >= p_max_attempts THEN
		RETURN false;
	END IF;

	INSERT INTO public.login_attempts ("ip") VALUES (p_identity_hash);
	DELETE FROM public.login_attempts
	WHERE "created_at" < p_retention_cutoff;

	RETURN true;
END;
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.consume_rate_limit_attempt(
	text,
	timestamp with time zone,
	integer,
	timestamp with time zone
) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.consume_rate_limit_attempt(
	text,
	timestamp with time zone,
	integer,
	timestamp with time zone
) TO CURRENT_USER;
