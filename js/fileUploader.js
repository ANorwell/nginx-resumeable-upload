//Incrementally upload a file using nginx-upload-module.
//See http://www.grid.net.ru/nginx/resumable_uploads.en.html
var fileUploader = function(file, segmentSize, sessionId) {

    var readByteRange = function(start, finish) {
        return Promise.fulfilled(file.slice(start,finish + 1));
    };



    var uploadByteRange = function(start, finish) {

        var upload = function(bytes) {
            var xhr = new XMLHttpRequest();
            var resolver = Promise.pending();
            xhr.open('POST', '/upload', true);
            xhr.responseType = 'text';

            xhr.setRequestHeader("Content-Type", "application/octet-stream");
            xhr.setRequestHeader("Content-Disposition",  'attachment,filename="' + file.name + '"');
            xhr.setRequestHeader("X-Content-Range", "bytes " + start + "-" + finish + "/" + file.size);
            xhr.setRequestHeader("X-Session-ID", sessionId);

            xhr.onload = function(e) {
                if (this.status === 200 || this.status === 201) {
                    var status = parseUploadStatus(this.response);
                    resolver.fulfill(status);
                } else {
                    resolver.reject(this.status);
                }
            };

            xhr.onerror = function(e) { resolver.reject(e); };

            xhr.send(bytes);
            return resolver.promise;
        };

        return readByteRange(start, finish).then(upload);
    };

    var parseUploadStatus = function(status) {
        if (status === "complete") {
            return {
                'complete' : true,
                'start' : 0,
                'end' : file.size - 1,
                'total' : file.size
            };
        } else {
            var matches = /(\d+)-(\d+)\/(\d+)/.exec(status);
            return {
                'completed' : false,
                'start' : parseInt(matches[1]),
                'end' : parseInt(matches[2]),
                'total' : parseInt(matches[3])
            };
        }
    };

    //Recursively upload segments of a file. Call onSegmentComplete
    //when each segment completes.
    var uploadSegments = function(status, onSegmentComplete) {
        if (status.complete == true) {
            return Promise.fulfilled(status);
        } else {
            var start = status.end + 1;
            var end = Math.min(status.end + segmentSize, status.total - 1);
            return uploadByteRange(start, end).then(
                function(nextStatus) {
                    onSegmentComplete(nextStatus);
                    return uploadSegments(nextStatus, onSegmentComplete);
                });
        }
    };

    //Fetch the status of a given file by uploading the first two bytes
    //of the file. The nginx upload module has a bug wherein repeatedly
    //uploading just the first byte of a file will cause the status to
    //be reported as corrupt, so use the first two.
    var fetchStatus = function() { return uploadByteRange(0,1); };

    return {
        'fetchStatus': fetchStatus,
        'uploadSegments': uploadSegments
    };
}
