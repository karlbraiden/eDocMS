

//Load when html renders
$(document).ready(function(){
  var disID = getCookie('me');
 document.getElementById('docSave').innerHTML = "Save to Folders";
  //handle document save in branch incoming
  $('#docSave').on('click', function(){
    if (!$('#newfile').val().includes('.')) {alert ('File extension not recognized!'); return false;}
    togglePanelProc(true);
    var fileroute = $('#fileroute');
    var newfile = $('#newfile');
    var branch = $('#selClas');
    var tag = $('#selTag').val(); if (tag===null) tag = [];
    var arrRef = getCookie('arrRef');
    var arrEnc = getCookie('arrEnc');
    var arrComm = getCookie('arrComm');

    var user = disID;
    var todo = {save:'save', fileroute: fileroute.val(), newfile:newfile.val(), class:branch.val(), tag:JSON.stringify(tag), user:user, refs:arrRef, encs:arrEnc, comments:arrComm};
    if (fileroute.val()!='empty'){
      $.ajax({
        type: 'POST',
        url: '/incoming',
        data: todo,
        success: function(data){
          togglePanelProc(true);
          location.replace('/incoming');
        }
      });
    }
    return false;
  });


});
