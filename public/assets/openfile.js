
//load modal when file open
function triggerButFile(){
  if (getCookie('mailnoti')=='true'){ //if opened from mail notification
    selChose();togglePanelHide(true);$('#overlay').show();
    var todo = {path:getCookie('mailpath'),file:getCookie('mailfile')};
      $.ajax({
        type: 'POST',
        url: '/fileopen',
        data: todo,
        success: function(data){
            //setCookie('realPath',getCookie('mailpath'));
            togglePanelHide(false);selChose();$('#overlay').hide();
           if (data!="notfound") {
             handleOpenFile(data);
           } //go to openfile.js

        }
      });
    setCookie('mailnoti','false');
  } else { //regular opening of file
      if (($('#newfile').val()=='Empty File') && (getCookie('fileAI')=='Empty File')) {
          $('#butFileopen').click();
          document.getElementById("largeModalLabel").innerHTML = "Browse File to Open";
          document.getElementById("Page").style.display = "none";
          modalDisplay('fileopen','D:/drive');
      } else {
        //setCookie('arrEnc',JSON.stringify([]),1);setCookie('arrRef',JSON.stringify([]),1);
        PDFObject.embed(getCookie('fileOpn'), "#pdf_view");
        $('#fileroute').val(getCookie('fileAI'));
        $('#newfile').val(getCookie('fileAI'));$("#selClas").val(getCookie('clasAI'));
        $('#disPath').val(getCookie('fileOpn'));
        $('#selTag').val(JSON.parse(getCookie('tagAI')));
        queryDoc();
        //selChose();
        //loadRefEnc();
      }
  }

}
//handle open file from modaldoc.js
function handleOpenFile(data){
    //Load all file metadata

    var arrData = JSON.parse(data);
    arrData.forEach(function (disData){
        PDFObject.embed(disData.path, "#pdf_view");
        var newPath =disData.realpath.replace('D:/drive/', disData.openpath);
        setCookie('realpath', disData.realpath,1);
        setCookie('newPath', newPath,1);
        $('#disPath').val(disData.path);
        setCookie('fileOpn',disData.path,1);
        updateSelectPage();
        //update filename textbox
        $('#newfile').val(disData.disp);
        $('#fileroute').val(disData.disp);
        setCookie('fileAI',$('#newfile').val(),1);
        setCookie('pathAI',disData.path,1);
        //update select classification
       $("#selClas").val(disData.disClas);
       setCookie('clasAI',$('#selClas').val(),1);
       //update select tags
       $("#selTag").val(disData.disTag)
       setCookie('tagAI',JSON.stringify($('#selTag').val()),1);
       selChose(); //trigger jquery for select2 and chosen
       //update reference
        $('#divRef').empty();var arrRef = [];
        disData.ref.forEach(function (ref){
          $('#refTrue').val('true');
          var names = ref.split('/');
          path = ref.substring(0,ref.length-(names[names.length-1]).length-1);path2 = ref.substring(0,ref.length-(names[names.length-1]).length);
          classPath=path.replace(/\//g,"---");classPath=classPath.replace(/:/g,'x--');classPath=classPath.replace(/ /g,"___");classPath=classPath.replace(/\./g,"z--");

          file = names[names.length-1];
          disFile = file.replace(/ /g,"___");disFile = disFile.replace(/\./,'---');
          showFile(disFile, classPath, "refenc");
          arrRef.push({file:file,path:path2});
        });
        setCookie('arrRef',JSON.stringify(arrRef),1);
        //update enclosure
        $('#divEnc').empty();arrEnc = [];
        disData.enc.forEach(function (enc){
          $('#refTrue').val('false');
          var names = enc.split('/');
          path = enc.substring(0,enc.length-(names[names.length-1]).length-1);path2 = enc.substring(0,enc.length-(names[names.length-1]).length);
          classPath=path.replace(/\//g,"---");classPath=classPath.replace(/:/g,'x--');classPath=classPath.replace(/ /g,"___");classPath=classPath.replace(/\./g,"z--");
          file = names[names.length-1];
          disFile = file.replace(/ /g,"___");disFile = disFile.replace(/\./,'---');
          showFile(disFile, classPath, "refenc");
          arrEnc.push({file:file,path:path2});
        });
        setCookie('arrEnc',JSON.stringify(arrEnc),1);
        //update comments
        $('#allComments').empty();arrComm = [];
        disData.disComm.reverse().forEach(function (comm){
          var name = comm.branch.split('-');
          $('#allComments').append(" " +
          "<div id='"+ comm.branch +"' class='box'> "+
          "<a style='color:black;font-family:arial;'><i class='fa fa-tag'></i>&nbsp;"+ name[0] +
          "<i onclick=removeComment('"+ comm.branch +"') style='margin-top:-8px;color:black;' class='btn btn-lg float-right fa fa-times'></i></i></a>" +
          "<div id='commContent'><p>"+ comm.content+"</p></div></div><br id='br-"+ comm.branch +"'>");
          arrComm.push({branch:comm.branch,content:comm.content});
        });
        setCookie('arrComm',JSON.stringify(arrComm),1);

    });
}

//populate the page selector and updaet the iframe for document signing
function updateSelectPage(){
  //populate select page
  loadPDF($('#disPath').val()).then(function(res){
    $('#selPageSign').empty();
    for (var i=1; i<=res; i++){
      $('#selPageSign').append("<option value='"+i.toString()+"'>"+i.toString()+"</option>");
    }
    $("#selPageSign").chosen({
        no_results_text: "Oops, nothing found!",
        width: "60px"
    });
    $('#selPageSign').trigger("chosen:updated");
  });
 //get first page and load to Canvas PDF
 var todo = {num:0,filepath: $('#disPath').val(),user:getCookie('me')};
 if ($('#fileroute').val()!='empty'){
   $.ajax({
     type: 'GET',
     url: '/signpdf',
     data: todo,
     success: function(data){
       document.getElementById('canvasPDF').src = "/assets/signcanvas.html";
     }
   });
 }
}
//Load when html renders
$(document).ready(function(){
  //initialize
  triggerButFile();
  var disID = getCookie('me');
  document.getElementById('docSave').innerHTML = "Save Metadata";
  document.getElementById('docEdit').style.display = "block";
  document.getElementById('docSend').style.display = "block";
  $('#signDocBut').show();
      //document.getElementById('signDocBut').style.display = "block";

  setCookie('noDate','true',1);

  $('#signDocBut').on('click',function(event){
    document.getElementById('canvasPDF').src = "/assets/signcanvas.html";
    $('#divSign').show(); $('#origButtons').hide();
    $('#disContent').hide();$('#disFrame').show();
  });
  $('#butCancelSign').on('click', function(event){
    $('#divSign').hide(); $('#origButtons').show();
    $('#disContent').show();$('#disFrame').hide();
  });
  //handle doocument edit in file Server
  $('#docEdit').on('click', function(event){
    if (!$('#newfile').val().includes('.')) {alert ('File extension not recognized!'); return false;}
      event.preventDefault(); // Recommended to stop the link from doing anything else
      var newPath = getCookie('newPath');
      var newfile = $('#newfile').val();
      disWindow = window.open("ie:"+newPath+newfile+"","disWindow","width=5px,heigh=5px");
      //start auto refresh Notification
      disClock = setInterval('closWindow()',20000);
  });
  //handle document save in open file
  $('#docSave').on('click', function(event){
    if (!$('#newfile').val().includes('.')) {alert ('File extension not recognized!'); return false;}
    if (window.location.toString().includes("/fileopen")) {
      if (getCookie('viewBr') != "openroute") {
        alert('Multiple session opened! Repeat changes on metadata upon reloading...'); window.location.reload(); return;
      }
    }
    event.preventDefault();
    var fileroute = $('#fileroute');
    var newfile = $('#newfile');
    var branch = $('#selClas');
    var tag = $('#selTag').val(); if (tag===null) tag = [];
    var arrRef = getCookie('arrRef');
    var arrEnc = getCookie('arrEnc');
    var realPath = getCookie('realpath');

    var arrComm = getCookie('arrComm');
    var user = disID;
    var todo = {save:'update', fileroute: fileroute.val(), path: realPath, newfile:newfile.val(), class:branch.val(), tag:JSON.stringify(tag), user:user, refs:arrRef, encs:arrEnc, comments:arrComm};
    //setCookie('fileAI',newfile.val());
    if (fileroute.val()!='empty'){
    //return cookie
    setCookie('fileAI',$('#newfile').val());
    setCookie('fileOpn',$('#disPath').val());
    $('#selTag').val(JSON.parse(getCookie('tagAI')));
      $.ajax({
        type: 'POST',
        url: '/incoming',
        data: todo,
        success: function(data){
          if (data!='fail') location.replace('/fileopen');
          else alert('Update Failed! Document is currently opened by another user.')
        }
      });
    }
    return false;
  });
  updateSelectPage();

  //handle save button for signing
  $('#butRelease1').on('click', function(event){
    $('#routeBody').hide();$('#routeattachPage').hide();$('#disrouteTitle').show();
    $('#divroyalCam').show();$('#routebutConfirm').hide();$('#disContRout').hide();$('#passapp').hide();
    openCamBranch();
  });
  //hnadle switch for sign and Release
  $('#toggledate').change(function(event){
    if ($('#toggledate').prop('checked')){
      setCookie('noDate','true',1);
    } else {
      setCookie('noDate','false',1);
    }
  });
  $('#toggleButCamRoyal').on('change', function(event){
    openCamBranch();
  });
  //select page
  $('#selPageSign').on('change', function(event){
    pointMainPDF(parseInt($('#selPageSign').val(),10));
    var todo = {num:parseInt($('#selPageSign').val(),10)-1,filepath: $('#disPath').val(),user:getCookie('me')};
    if ($('#fileroute').val()!='empty'){
      $.ajax({
        type: 'GET',
        url: '/signpdf',
        data: todo,
        success: function(data){
          document.getElementById('canvasPDF').src = "/assets/signcanvas.html";
        }
      });
    }
  });
});
