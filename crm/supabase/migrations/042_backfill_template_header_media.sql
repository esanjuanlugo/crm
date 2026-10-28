-- Muestra en el Inbox la imagen/video/documento del encabezado de plantillas
-- ya enviadas (antes no se guardaba en messages.media_url).
UPDATE messages m
SET media_url = t.header_media_url
FROM conversations c, message_templates t
WHERE m.conversation_id = c.id
  AND t.account_id = c.account_id
  AND t.name = m.template_name
  AND m.content_type = 'template'
  AND m.media_url IS NULL
  AND t.header_type IN ('image', 'video', 'document')
  AND t.header_media_url IS NOT NULL;
