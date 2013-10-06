//Incrementally upload a file using nginx-upload-module
//
function fileUploader(file, segmentSize, sessionId) {

    var readByteRange = function(start, finish) {
        var reader = new FileReader();
        var resolver = Promise.pending();

        reader.onloadend = function(evt) {
            if (evt.target.readyState == FileReader.DONE) {

                if (evt.target.error !== null) {
                    resolver.reject(evt.target.error);
                } else {
                    resolver.fulfill(evt.target.result);
                }
            }
        };

        var blob = file.slice(start,finish + 1);
        reader.readAsBinaryString(blob);

        return resolver.promise;
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
                    console.log(status);
                } else {
                    resolver.reject(this.status);
                    console.error("Got XMLResponse error: ", this.status);
                }
            };

            xhr.onerror = function(e) {
                console.error(e);
                resolver.reject(e);
            };

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
                'end' : file.size,
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

    //recursively upload segments of a file. Call onSegmentComplete
    //when each segment completes
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

    return {
        'fetchStatus': function() { return uploadByteRange(0,1); },
        'uploadSegments': uploadSegments
    };
}


(function() {

    var uploader;

    var segmentSize = 1204*1024;

    function createSessionId(file) { return file.name; }

    function updateProgress(status) {

        //fileUploader will upload the first two bytes when checking status.
        //Don't show the user that two bytes of their file has been uploaded.
        if (status.end == 2) status.end = 0;

        var progress = (status.end + 1) * 100 / status.total;
        document.getElementById('progress').value = progress;
        document.getElementById('list').innerHTML = (status.end + 1) + ' bytes / ' + status.total + ' bytes';
    }

    function handleFileSelect(evt) {
        var files = evt.target.files; // FileList object

        if (files.length === 0) {
            alert("Please select a file.");
            return;
        }

        var file = files[0];
        uploader = fileUploader(file, segmentSize, createSessionId(file));

        uploader.fetchStatus().then(function(status) {
            updateProgress(status);
        });
    }

    function handleUpload(evt) {

        if (!uploader) {
            alert("Please select a file.");
            return;
        }

        uploader.fetchStatus()
            .then( function(status) {
                return uploader.uploadSegments( status, updateProgress);
            })
            .then(
                function(status) {
                    console.log("Upload complete!");
                    document.getElementById('progress').value = 100;
                },
                function(error) {
                    console.error("upload not complete!");
                    console.log(error.stack);
                    console.error(error);
                });
    }

    if (!window.File || !window.FileReader || !window.FileList || !window.Blob) {
        alert('The File APIs are not fully supported in this browser.');
    }

    document.getElementById('files').addEventListener('change', handleFileSelect, false);
    document.getElementById('form').addEventListener('submit', handleUpload, false);
})();
