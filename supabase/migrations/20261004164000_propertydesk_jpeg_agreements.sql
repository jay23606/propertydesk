-- Preserve photographed agreement addenda alongside PDF and DOCX source files.
alter table public.pd_documents
  drop constraint if exists pd_documents_content_type_check;

alter table public.pd_documents
  add constraint pd_documents_content_type_check
  check (content_type in (
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg'
  ));

update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg'
]
where id = 'pd-private-agreements';
