
//Load when html renders
$(document).ready(function(){

togglePanelHide(true);$('#formroute').hide();
    //handle button avatar upload clicked
    $('#butUploadAvatar').on('click', function(e){
        let files = $('#avatarinput').val().split('\\'); let filename = files[files.length-1];
        $('#overlay').show();
        let upFiles = new FormData();setCookie('fileAI',filename,1);
        upFiles.append('avatarinput',$('#avatarinput')[0].files[0]);
        $.ajax({
          type: 'POST',
          url: '/avatarupload',
          processData: false,
          contentType: false,
          async:false,
          cache:false,
          mimeTypes: "multipart/form-data",
          data: upFiles,
          success: function(data){
            $('#overlay').hide();
            if (data=='successful') location.reload();
          }
        });
        return false;
    });
    //handle button PNG upload clicked
    $('#butUploadPng').on('click', function(e){
        let files = $('#pnginput').val().split('\\'); let filename = files[files.length-1];
        $('#overlay').show();
        let upFiles = new FormData();setCookie('fileAI',filename,1);
        upFiles.append('pnginput',$('#pnginput')[0].files[0]);
        $.ajax({
          type: 'POST',
          url: '/pngupload',
          processData: false,
          contentType: false,
          async:false,
          cache:false,
          mimeTypes: "multipart/form-data",
          data: upFiles,
          success: function(data){
            $('#overlay').hide();
            if (data=='successful') location.reload();
          }
        });
        return false;
    });
    //handle button SVG upload clicked
    $('#butUploadSvg').on('click', function(e){
        let files = $('#svginput').val().split('\\'); let filename = files[files.length-1];
        $('#overlay').show();
        let upFiles = new FormData();setCookie('fileAI',filename,1);
        upFiles.append('svginput',$('#svginput')[0].files[0]);
        $.ajax({
          type: 'POST',
          url: '/svgupload',
          processData: false,
          contentType: false,
          async:false,
          cache:false,
          mimeTypes: "multipart/form-data",
          data: upFiles,
          success: function(data){
            $('#overlay').hide();
            if (data=='successful') location.reload();
          }
        });
        return false;
    });
});
