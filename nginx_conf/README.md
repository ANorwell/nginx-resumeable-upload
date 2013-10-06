This example nginx.conf configures the nginx_upload_module for resumable file
uploads. When an upload  completes, it is passed to the backend as a get request
at localhost:4567. Uploads are handled at the path /upload.

The `static` directory should exist, and should contain all the static assets,
which will be served relative to the root path.

Requests under /file will also be passed to the backend.
