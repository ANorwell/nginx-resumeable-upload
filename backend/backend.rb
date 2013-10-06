require 'sinatra'

file_map = {}

get '/upload' do
  puts "Mapping #{params[".name"]} to #{params[".path"]}"
  file_map[params[".name"]] = params[".path"]
  "complete"
end

get '/file/:file' do |f|
  if (file_map[f])
    send_file file_map[f]
  else
    status 404
  end
end
