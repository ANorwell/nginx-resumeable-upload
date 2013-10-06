## About

This backend handles uploads by maintaining a map from completed upload filenames to the location of the uploaded file.

In general, the backend MUST return a 200 response with the body 'complete' when an upload completes to work with fileUploader.js.

## To Run

gem install sinatra
ruby backend.rb
