var _PDF_DOC,
    _CURRENT_PAGE,
    _TOTAL_PAGES,
    _PAGE_RENDERING_IN_PROGRESS = 0,
    _CANVAS = document.querySelector('#pdfPage');

//Function for deleting files from References and enclosures
async function delEncRef(paramDiv,file, paramCookie){
  $('#'+paramDiv+'-'+file+'').remove();
  newEnc = file.replace(/___/g," ");newEnc = newEnc.replace(/---/,'.');
  var arrEnc = []; var disEnc = JSON.parse(getCookie(paramCookie));
  if (disEnc.length > 0) arrEnc = disEnc;
  var obj = arrEnc.find(({file})=> file === newEnc);
  var resArr = arrEnc.filter(function(res) {return res!=obj; });
  await setCookie(paramCookie,JSON.stringify(resArr),1);
  return;
};
//function to display attachments into the pdf viewer
function dispAttach(disDir, disFile){
  selChose();
  if (disDir!='Page'){
    togglePanelHide(true);$('#overlay').show()//display spinner

    disDir=disDir.replace(/x--/g,':');disDir=disDir.replace(/z--/g,'.');disDir=disDir.replace(/---/g,"/");disDir=disDir.replace(/___/g," ");
    newFile = disFile.replace(/___/g," ");newFile = newFile.replace(/---/,'.');
    var todo = {path:disDir + '/',file:newFile};
      $.ajax({
        type: 'POST',
        url: '/showfile',
        data: todo,
        success: function(data){
          PDFObject.embed(data, "#pdf_view"); //display attach file to PDF
          togglePanelHide(false);$('#overlay').hide()//display spinner
        }
      });
  }else {
    var num = disFile.replace('Page_','');
    PDFObject.embed(getCookie('fileOpn'), "#pdf_view",{page:num});
  }

}
//Function for adding files from modal to Reference and Enclosure
function showFile(disFile, disDir, flag){
  newFile = disFile.replace(/___/g," ");newFile = newFile.replace(/---/,'.');
  var olddisDir = disDir;
  disDir=disDir.replace(/x--/g,':');disDir=disDir.replace(/z--/g,'.');disDir=disDir.replace(/---/g,"/");disDir=disDir.replace(/___/g," ");
 if (flag=='refenc'){//if click on reference and enclosuse

   if ($('#refTrue').val()==='true'){
     updRefEncCookie('arrRef', newFile, disDir);
     $('#divRef').append("<div id='ref-"+disFile+"'>&nbsp;&nbsp;&nbsp;&nbsp;<button type='button' onclick=delEncRef('ref','"+disFile+"','arrRef') class='btn btn-danger btn-sm fa fa-times'></button><button type='button' class='btn btn-link btn-sm' onclick=dispAttach('"+olddisDir+"','"+disFile+"')>"+newFile+"</button></div>");
   } else {
     updRefEncCookie('arrEnc', newFile, disDir);
     $('#divEnc').append("<div id='enc-"+disFile+"'>&nbsp;&nbsp;&nbsp;&nbsp;<button type='button' onclick=delEncRef('enc','"+disFile+"','arrEnc') class='btn btn-danger btn-sm fa fa-times'></button><button type='button' class='btn btn-link btn-sm' onclick=dispAttach('"+olddisDir+"','"+disFile+"')>"+newFile+"</button></div>");
   }
 }else {//if click on File Open
   //setCookie('realPath',disDir + '/');
   togglePanelHide(true);$('#overlay').show()//display spinner
   var todo = {path:disDir + '/',file:newFile};
     $.ajax({
       type: 'POST',
       url: '/fileopen',
       data: todo,
       success: function(data){
         togglePanelHide(false);$('#overlay').hide()//display spinner
         handleOpenFile(data); //go to openfile.js
       }
     });
    }
    $("#butmodClose").click();
}
//expand directory
function showDir(path,flag){
  //classPath=path.replace(/:/g,'x-');classPath=classPath.replace(/\//g,"---");classPath=classPath.replace(/ /g,"___")
  classPath = path.replace(/___/g," ");classPath = classPath.replace(/x--/g,":");classPath=classPath.replace(/z--/g,".");classPath = classPath.replace(/---/g,"/");
  classPath=classPath+"/";
  var todo = {path:classPath};
    $.ajax({
      type: 'POST',
      url: '/browsedrive',
      data: todo,
      success: function(data){
        var arrObj = JSON.parse(data);
        var dirs = arrObj['dirs'];
        var files = arrObj['files'];
        //update Modal
         $('#'+path+'').empty();
        for (var i=0; i < dirs.length; i++)
        {
           classDirs = dirs[i].replace(/ /g,"___");classDirs=classDirs.replace(/\./g,"z--");
           $('#'+path+'').append("<li><a onclick=showDir('"+path+"---"+classDirs+"','"+flag+"')  href='#'>" + dirs[i] +"</a><ul><div id='"+path+"---"+classDirs+"'></div></ul></li>");
        }
        for (var i=0; i < files.length; i++)
        {
          disFile = files[i].replace(/ /g,"___");disFile = disFile.replace(/\./,'---');
          $('#'+path+'').append("<li><a onclick=showFile('"+disFile+"','"+path+"','"+flag+"')  href='#'>" + files[i] +"</a></li>");
        }
        $(".file-tree").filetree();
      }
    });
}
function updateModalTabPage(){
  var options = {
    height: "400px",
    page:1
  };
  loadPDF($('#disPath').val()).then(function(res){
    $('#selPage').empty();
    for (var i=1; i<=res; i++){
      $('#selPage').append("<option value='"+i.toString()+"'>"+i.toString()+"</option>");
    }
    PDFObject.embed($('#disPath').val(), "#attachPage", options);
  });
}
//function initialize modal dialog
function modalDisplay(flag, path){
  //Update Page
  if (flag=="refenc"){
    updateModalTabPage();
  }
  //upate browse files
  var todo = {path:path + '/'};
    $.ajax({
      type: 'POST',
      url: '/browsedrive',
      data: todo,
      success: function(data){
        var arrObj = JSON.parse(data);
        var dirs = arrObj['dirs'];
        var files = arrObj['files'];
        $('.driveList').empty();
        classPath=path.replace(/\//g,"---");classPath=classPath.replace(/:/g,'x--');classPath=classPath.replace(/ /g,"___");classPath=classPath.replace(/\./g,"z--");
        for (var i=0; i < dirs.length; i++)
        {
          classDirs = dirs[i].replace(/ /g,"___");classDirs=classDirs.replace(/\./g,"z--");
          $('.driveList').append("<li><a onclick=showDir('"+classPath+"---"+classDirs+"','"+flag+"')  href='#'>" + dirs[i] +"</a><ul><div  id='"+classPath+"---"+classDirs+"'></div></ul></li>");
        }
        for (var i=0; i < files.length; i++)
        {
          disFile = files[i].replace(/ /g,"___");disFile = disFile.replace(/\./,'---');
          $('.driveList').append("<li><a onclick=showFile('"+disFile+"','"+classPath+"','"+flag+"')  href='#'>" + files[i] +"</a></li>");
        }
          $(".file-tree").filetree();
      }
    });
};
//function update ref and enc cookies
function updRefEncCookie(param, paramFile, paramDir){
  var arrRef = [];
  try{
    var disRef = JSON.parse(getCookie(param));
    if (disRef.length > 0) arrRef = disRef;
  }catch{}
  arrRef.push({file:paramFile, path:paramDir});
  setCookie(param,JSON.stringify(arrRef),1);
}
// initialize and load the PDF
async function loadPDF(pdf_url) {
  // get handle of pdf document
      try {
          _PDF_DOC = await pdfjsLib.getDocument({ url: pdf_url });
      }
      catch(error) {
          //alert(error.message);
      }
      // total pages in pdf
      _TOTAL_PAGES = _PDF_DOC.numPages;
      return _TOTAL_PAGES;
}
//Point to PDF Page
function pointPage(){
  var num = document.getElementById("selPage").selectedIndex;
  var options = {
    height: "400px",
    page:num + 1
  };
  PDFObject.embed($('#disPath').val(), "#attachPage",options);
};
function pointMainPDF(num){
  var options = {
    page:num
  };
  PDFObject.embed($('#disPath').val(), "#pdf_view",options);
}
//Load when html renders
$(document).ready(function(){

    //assign picture based on id ME
  var disID = getCookie('me');
  //handle reference button click
  $('#butRef').on('click', function(){
    $('#refTrue').val('true');
    document.getElementById("largeModalLabel").innerHTML = "Attachments";
    document.getElementById("Page").style.display = "block";
    modalDisplay('refenc','D:/drive');
  });
 //handle enclosure button click
  $('#butEnc').on('click', function(){
    $('#refTrue').val('false');
    document.getElementById("largeModalLabel").innerHTML = "Attachments";
    document.getElementById("Page").style.display = "block";
    modalDisplay('refenc','D:/drive');
  });
  //cancel clicked
  $('#modButCanc').on('click', function(){
    if (document.getElementById('newfile').style.display=='none') togglePanelHide(true);
    selChose();$('#overlay').hide()//display spinner

  });
  //cancel clicked
  $('#topClose').on('click', function(){
    if (document.getElementById('newfile').style.display=='none') togglePanelHide(true);
    selChose();$('#overlay').hide()//display spinner

  });
  //handle confirm button from pdf pages
  $('#butConfirm').on('click', function(event){
    event.preventDefault();
    var disFile = document.getElementById("selPage").selectedIndex + 1;

    if ($('#refTrue').val()=='true'){
      updRefEncCookie('arrRef', 'Page_'+disFile, 'Page');
      $('#divRef').append("<div id='ref-Page_"+disFile+"'>&nbsp;&nbsp;&nbsp;&nbsp;<button type='button' onclick=delEncRef('ref','Page_"+disFile+"','arrRef') class='btn btn-danger btn-sm fa fa-times'></button><button type='button' class='btn btn-link btn-sm' onclick=pointMainPDF('"+disFile+"')>Page_"+disFile+"</button></div>");
    } else {
      updRefEncCookie('arrEnc', 'Page_'+disFile, 'Page');
      $('#divEnc').append("<div id='enc-Page_"+disFile+"'>&nbsp;&nbsp;&nbsp;&nbsp;<button type='button' onclick=delEncRef('enc','Page_"+disFile+"','arrEnc') class='btn btn-danger btn-sm fa fa-times'></button><button type='button' class='btn btn-link btn-sm' onclick=pointMainPDF('"+disFile+"')>Page_"+disFile+"</button></div>");
    }
    $("#butmodClose").click();
  });
});
