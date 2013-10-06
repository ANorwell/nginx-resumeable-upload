# Resumable File Uploads using nginx_upload_module

## Setup

1. Compile nginx using nginx_upload_module. As per
   [this issue](https://github.com/vkholodkov/nginx-upload-module/issues/41),
   this module only works with nginx < 1.3.9, although some patches may be
   available.

2. Configure nginx.conf appropriately to work with this app. An example conf
   file is in the `nginx_conf` directory. At a bare minimum:
       * Resumable uploads should be enabled at the path `/upload`
       * The configured backend to which completed uploads will be passed will
         reply with a 200 with the body `completed`.

3. Start the backend server. In the example nginx.conf, it runs at
   localhost:4567. There is an example [Sinatra](http://www.sinatrarb.com/)
   backend in the `backend` directory. It will accept upload requests at
   /upload, and will serve completed uploaded files at `/file/<filename>`.

4. Make sure all the static assets (`index.html`, `upload.css`, `js/*`) are
   served from the same host as the /upload endpoint.

## Usage

Upload using the web interface. Uploaded files may be retrieved at
`/file/<filename>`.

## fileUploader.js

The js library works as follows:

    var uploader = fileUploader(file, segmentSize)

where `file` is a File object from the HTML5 File API, and `segmentSize` is the
size in bytes of each segment of an upload. The methods of the uploader object
return [Bluebird Promises/A+](https://github.com/petkaantonov/bluebird); which
may be interacted with using (this
API)[https://github.com/petkaantonov/bluebird/blob/master/API.md]. It offers the
following methods:

* `uploader.fetchStatus()`: returns a promise for a status object, which has the
  following structure:

        {
          completed : [true|false],
          start : <The first byte uploaded. Should always be 0>
          end : <The last byte uploaded>
          total : <The total size of the file in bytes>
        }
  `completed` should be true if and only if `end === total - 1`.

* `uploader.uploadSegments(status, onSegmentComplete)`: given a status object,
  will upload the remaining segments of the file. `onSegmentComplete(newStatus)`
  will be called after each segment is uploaded, with a status argument
  reflecting the new state. It returns a promise with the completed status.

Thus, to upload a file, one may do:

      uploader.fetchStatus()
          .then(function(status) {
              uploader.uploadSegments(status, function(newStatus) {});
          })
          .then( function(status) { console.log("upload complete"); } );


## Design

Resumable uploads in the upload module work in the following way:

1. Uploaded segments of a single file should share a session ID to identify them
   as part of the same file.

2. When a segment of a file is uploaded, it will return a status in the body,
   e.g. 0-5,9-15/24, indicating that the file is 24 bytes long, and bytes 0-5
   and 9-15 have been uploaded. Partial uploads will get a 201 response.

3. Segments may be reuploaded, as long as it is not in parallel, and the
   segments have the same data for that segment.

The fileUploader js library will attempt a small upload (the first 2 bytes of a
file; it turns out the upload module has a bug wherein it will not handle
repeated uploads of the single byte of a file) to get the status of an
upload. From that starting status, the uploader will incrementally upload the
file in 1MB segments.

## Limitations

* The session ID is created by hashing the file name and size. This potentially maps
  different files to the same session ID, which will cause upload errors if they
  are being uploaded simultaneously. Other approaches would be to md5 the file,
  or to involve the user identity when creating the session ID.

## Author

Arron Norwell
