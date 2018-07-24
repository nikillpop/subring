var fs = require('fs');

var express = require('express');
var app = express();

app.use(express.static(__dirname+'/public'));

var exphbs = require('express-handlebars');
app.engine('hbs', exphbs({
  defaultLayout: 'main',
  extname: '.hbs'
}));
app.set('view engine', 'hbs');

var cors = require('cors');
app.use(cors());

var request = require('request');

var Canvas = require('canvas');
var Image = Canvas.Image;

var fontCanvas, fontCtx, fontData;
var fontImage = new Image();

fs.readFile(__dirname+'/public/img/button/font.png', function(err, src) {
  if (err) return console.log(err);
  fontImage.src = src;
  
  fontCanvas = new Canvas(fontImage.width,fontImage.height);
  fontCtx = fontCanvas.getContext('2d');
  
  fontCtx.drawImage(fontImage,0,0);
  fontData = fontCtx.getImageData(0,0,fontCanvas.width,fontCanvas.height).data;
});

function charToCoords(char) {
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz 1234567890';
  var index = chars.indexOf(char);
  
  var pixelIndex = 0;
  var x1, x2;
  
  for (var i=0;i<fontCanvas.width;i++) {
    if (fontData[i*4+3]==255) {
      if (pixelIndex==index) {
        x1 = i+1;
      } else if (pixelIndex==index+1) {
        x2 = i;
        break;
      }
      pixelIndex++;
    }
  }
  
  var width = x2-x1+1;
  
  return {
    x: x1,
    y: 1,
    width: width,
    height: fontCanvas.height-1
  };
}

function getSubrings(user, cb) {
  request('https://hyperlink.neocities.org/subrings.json', function(err, response, body) {
    if (err) return console.log(err);
    var data = JSON.parse(body);
    
    var subrings = [];
    for (var i=0;i<data.length;i++) {
      var memberIndex = data[i].members.indexOf(user);
      if (memberIndex>-1) {
        var previousIndex = memberIndex==0 ? data[i].members.length-1 : memberIndex-1;
        var nextIndex = memberIndex==data[i].members.length-1 ? 0 : memberIndex+1;
        
        subrings.push({
          name: data[i].name,
          previous: data[i].members[previousIndex],
          next: data[i].members[nextIndex]
        });
      }
    }
    
    cb(subrings);
  });
}

app.get('/button', function(req, res) {
  var user = req.query.user;
  getSubrings(user, function(subrings) {
    res.render('full', {
      subrings: subrings
    });
  });
});

app.get('/subring', function(req, res) {
  var name = req.query.name;
  
  fs.readFile(__dirname+'/public/img/button/subring.png', function(err, src) {
    if (err) return console.log(err);
    var img = new Image();
    img.src = src;
  
    var canvas = new Canvas(img.width,img.height);
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img,0,0);
    
    var chars = [];
    for (var i=0;i<name.length;i++) chars.push(charToCoords(name[i]));
    
    var width = 0;
    var height = chars[0].height;
    for (var i=0;i<chars.length;i++) {
      if (i==chars.length-1) chars[i].width--;
      width += chars[i].width;
    }
    
    var centerX = Math.round((canvas.width-width)/2);
    var centerY = Math.round((canvas.height-height)/2);
    
    var currentX = 0;
    for (var i=0;i<name.length;i++) {
      var charCoords = chars[i];
      ctx.drawImage(fontImage, charCoords.x, charCoords.y, charCoords.width, charCoords.height, centerX+currentX, centerY-1, charCoords.width, charCoords.height);
      currentX += charCoords.width;
    }
    
    canvas.pngStream().pipe(res);
  });
});

var server = require('http').createServer(app);
server.listen(process.env.PORT, process.env.IP, function() {
  console.log('Server started!');
});