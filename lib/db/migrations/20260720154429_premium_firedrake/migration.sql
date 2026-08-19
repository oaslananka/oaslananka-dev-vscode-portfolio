ALTER TABLE "contact_messages" ADD COLUMN "notification_next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "contact_messages" ADD COLUMN "notification_claim_token" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "contact_messages" ADD COLUMN "notification_claim_expires_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "contact_messages_notification_delivery_idx" ON "contact_messages" USING btree ("notification_status","notification_next_attempt_at","notification_claim_expires_at");--> statement-breakpoint
CREATE FUNCTION public.claim_contact_notifications(
	p_claim_token text,
	p_now timestamp with time zone,
	p_lease_expires_at timestamp with time zone,
	p_batch_size integer,
	p_max_attempts integer,
	p_message_id integer DEFAULT NULL
)
RETURNS SETOF public.contact_messages
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $function$
BEGIN
	IF p_claim_token IS NULL
		OR p_claim_token = ''
		OR pg_catalog.octet_length(p_claim_token) > 200 THEN
		RAISE EXCEPTION 'Invalid contact notification claim token.' USING ERRCODE = '22023';
	END IF;

	IF p_now IS NULL
		OR p_lease_expires_at IS NULL
		OR p_lease_expires_at <= p_now THEN
		RAISE EXCEPTION 'Invalid contact notification lease window.' USING ERRCODE = '22023';
	END IF;

	IF p_batch_size IS NULL
		OR p_batch_size < 1
		OR p_batch_size > 100 THEN
		RAISE EXCEPTION 'Invalid contact notification batch size.' USING ERRCODE = '22023';
	END IF;

	IF p_max_attempts IS NULL
		OR p_max_attempts < 1
		OR p_max_attempts > 100 THEN
		RAISE EXCEPTION 'Invalid contact notification attempt limit.' USING ERRCODE = '22023';
	END IF;

	IF p_message_id IS NOT NULL AND p_message_id < 1 THEN
		RAISE EXCEPTION 'Invalid contact notification message ID.' USING ERRCODE = '22023';
	END IF;

	RETURN QUERY
	WITH candidates AS (
		SELECT message."id"
		FROM public.contact_messages AS message
		WHERE message."notification_status" IN ('pending', 'failed')
			AND message."notification_attempts" < p_max_attempts
			AND message."notification_next_attempt_at" <= p_now
			AND (
				message."notification_claim_expires_at" IS NULL
				OR message."notification_claim_expires_at" <= p_now
			)
			AND (p_message_id IS NULL OR message."id" = p_message_id)
		ORDER BY message."notification_next_attempt_at", message."id"
		FOR UPDATE SKIP LOCKED
		LIMIT p_batch_size
	)
	UPDATE public.contact_messages AS message
	SET
		"notification_claim_token" = p_claim_token,
		"notification_claim_expires_at" = p_lease_expires_at
	FROM candidates
	WHERE message."id" = candidates."id"
	RETURNING message.*;
END;
$function$;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.claim_contact_notifications(
	text,
	timestamp with time zone,
	timestamp with time zone,
	integer,
	integer,
	integer
) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.claim_contact_notifications(
	text,
	timestamp with time zone,
	timestamp with time zone,
	integer,
	integer,
	integer
) TO CURRENT_USER;
