(function() {

    var uploader;

    var segmentSize = 1204*1024;

    function updateProgress(status) {

        //fileUploader will upload the first two bytes when checking status.
        //Don't show the user that two bytes of their file has been uploaded.
        if (status.end == 1) status.end = -1;

        var progress = (status.end + 1) * 100 / status.total;
        document.getElementById('progress').value = progress;
        document.getElementById('list').innerHTML = (status.end + 1) + ' bytes / ' + status.total + ' bytes';
    }

    function handleFileSelect(evt) {
        var files = evt.target.files;

        if (files.length === 0) {
            alert("Please select a file.");
            return;
        }

        var file = files[0];
        uploader = fileUploader(file, segmentSize);

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
