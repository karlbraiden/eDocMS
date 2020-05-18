const fs = require('fs');
const path = require('path');
const dateformat = require('dateformat');
//import { degrees, PDFDocument, rgb, StandardFonts } from 'pdf-lib';
const  { degrees, PDFDocument, rgb, StandardFonts}  = require('pdf-lib');
const dbhandle = require('./dbhandle');
var drive = 'D:/Drive/';
dbhandle.settingDis((setting)=>{drive = setting.maindrive;});

//Get page from selected page number and save to PDF-temp
exports.mergePDF = async function (srcPath, dstPath, pagePath, num, callback) {
  const url = srcPath
  //calculate line nr
  //console.log(url);
  if ((fs.existsSync(url)) && (fs.existsSync(pagePath))){
      var existingPdfBytes = fs.readFileSync(path.resolve(url));
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      var pagePdfBytes = fs.readFileSync(path.resolve(pagePath));
      const pagepdfDoc = await PDFDocument.load(pagePdfBytes);

      const newpdfDoc = await PDFDocument.create()
      const pages = pdfDoc.getPages();
      for (var x=0; x < pages.length; x++){
        let disPage = null;
        if (x != num) [disPage] = await newpdfDoc.copyPages(pdfDoc,[x]);
        else [disPage] = await newpdfDoc.copyPages(pagepdfDoc,[0]);
        newpdfDoc.addPage(disPage);
      }
      const pdfBytes = await newpdfDoc.save();
      fs.writeFileSync(dstPath, pdfBytes);
  } else console.log('sign PDF not found');
  callback();
};
//Get page from selected page number and save to PDF-temp
exports.returnPage = async function (srcPath, dstPath, num, callback) {
  const url = srcPath
  if (fs.existsSync(url)){
      var existingPdfBytes = fs.readFileSync(path.resolve(url));
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const newpdfDoc = await PDFDocument.create()
      //const pages = pdfDoc.getPages();
      //const firstPage = pages[num];
      const [disPage] =  await newpdfDoc.copyPages(pdfDoc,[num]);
      newpdfDoc.addPage(disPage);
      const pdfBytes = await newpdfDoc.save();
      fs.writeFileSync(dstPath, pdfBytes);
      callback();
  } else console.log('error');
};
//add signature into main documents
exports.addSignMainDoc = async function (group, id, srcPath, dstPath, disX, disY, nodate, diswidth, disheight, callback) {
  const url = srcPath
  if (fs.existsSync(url)){
      var existingPdfBytes = fs.readFileSync(path.resolve(url));
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { width, height } = firstPage.getSize();

      const pngImageBytes = fs.readFileSync(drive+group+'/Signature/' + id +'.png')
      const pngImage = await pdfDoc.embedPng(pngImageBytes)
      const pngDims = pngImage.scale(0.5)
      var varX = (width/parseInt(diswidth,10));
      var varY = (height/parseInt(disheight,10));

      firstPage.drawText(Date.now().toString(), { //date for record number
        x: (parseInt(disX, 10) * varX) -5, //- pngDims.width / 2 + 75,
        y: ((height - (parseInt(disY, 10)  * varY)) - (90 * varY))  + 60, //- pngDims.height,
        size: 5,
        font: helveticaFont,
        color: rgb(0, 0.53, 0.71),
      });
      if (nodate!='true'){
        firstPage.drawText(dateformat(Date.now(),"dd mmm yyyy"), { //date signee
          x: (parseInt(disX, 10) * varX) + 90, //- pngDims.width / 2 + 75,
          y: ((height - (parseInt(disY, 10) * varY)) - (90 * varY)) + 35, //- pngDims.height,
          size: 11,
          font: helveticaFont,
          color: rgb(0, 0.10, 0.50),
        });
      }
      firstPage.drawImage(pngImage, {
        x: (parseInt(disX, 10) * varX) - 17, //- pngDims.width / 2 + 75,
        y: (height - (parseInt(disY, 10) * varY)) - (90 * varY), //- pngDims.height,
        width: pngDims.width,
        height: pngDims.height,
      })
      const pdfBytes = await pdfDoc.save();
      fs.writeFileSync(dstPath, pdfBytes);
      callback();
  } else console.log('error');


};

//Add signature into routing slip
exports.addSignRoutePDF = async function (level, cnt, srcPath, dstPath, req, group, callback) {
  const url = srcPath;
  //calculate line nr
  var disY = 469;
  var disX = 250 ;
  if (level.toUpperCase()=='CO'){
    disY = disY + 87;
  }else if (level.toUpperCase()=='DEP'){
    disY = disY + 58;
  }else {
    for (x=1; x<cnt; x++){
      disY = disY - 29;
    }
  }
  if (fs.existsSync(url)){
      var existingPdfBytes = fs.readFileSync(path.resolve(url));
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { width, height } = firstPage.getSize();
      const textSize = 12;
      const textWidth = helveticaFont.widthOfTextAtSize(req.body.user, textSize);
      const textHeight = helveticaFont.heightAtSize(textSize);
      if ((cnt==1)) {
        firstPage.drawText(req.body.subject, { //subject
          x: 140,
          y: 680,
          size: textSize,
          font: helveticaFont,
          color: rgb(0, 0.53, 0.71),
        });
        firstPage.drawText(req.body.branch.toString(), { //action branch
          x: 160,
          y: 625,
          size: textSize,
          font: helveticaFont,
          color: rgb(0, 0.53, 0.71),
        });
      }
      firstPage.drawText(dateformat(Date.now(),"dd mmm yyyy"), { //date signee
        x: disX - 190,
        y: disY,
        size: textSize,
        font: helveticaFont,
        color: rgb(0, 0.53, 0.71),
      });
      firstPage.drawText(group.toUpperCase(), { //from
        x: disX - 100,
        y: disY,
        size: textSize,
        font: helveticaFont,
        color: rgb(0, 0.53, 0.71),
      });
      firstPage.drawText(req.body.branch.toString(), { //to
        x: disX - 50,
        y: disY,
        size: textSize,
        font: helveticaFont,
        color: rgb(0, 0.53, 0.71),
      });
      firstPage.drawText(req.body.action.toString(), { //action required
        x: disX + 95,
        y: disY,
        size: textSize,
        font: helveticaFont,
        color: rgb(0, 0.53, 0.71),
      });
      if (req.body.remark.length > 30){
        firstPage.drawText(req.body.remark.substring(0,35), { //remark
          x: disX + 140,
          y: disY + 13,
          size: textSize,
          font: helveticaFont,
          color: rgb(0, 0.53, 0.71),
        });
        firstPage.drawText(req.body.remark.substring(35), { //remark
          x: disX + 140,
          y: disY,
          size: textSize,
          font: helveticaFont,
          color: rgb(0, 0.53, 0.71),
        });
      }else {
        firstPage.drawText(req.body.remark, { //remark
          x: disX + 140,
          y: disY,
          size: textSize,
          font: helveticaFont,
          color: rgb(0, 0.53, 0.71),
        });
      }

      firstPage.drawText(req.body.user, {//branch chief
        x: disX + 20,
        y: disY + 13,
        size: textSize,
        font: helveticaFont,
        color: rgb(0, 0.53, 0.71),
      });
      firstPage.drawText(Date.now().toString(), { //date for record number
        x: disX - 5,
        y: disY,
        size: textSize,
        font: helveticaFont,
        color: rgb(0, 0.53, 0.71),
      });
      firstPage.drawRectangle({ //draw rectangle on signature
        x: disX - 5,
        y: disY + 13,
        width: 80,
        height: textHeight,
        borderColor: rgb(1, 0, 0),
        borderWidth: 1.5,
      });
      const pdfBytes = await pdfDoc.save();
      fs.writeFileSync(dstPath, pdfBytes);
      callback();
  } else console.log('error');


};
