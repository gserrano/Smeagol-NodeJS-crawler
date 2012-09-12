var jsdom = require("jsdom"),
    jquery = require("jquery"),
    request = require("request"),
    fs     = require('fs'),
    mongoose = require('mongoose'),
    db = mongoose.connect('mongodb://10.12.3.151/gserrano'),
    fs = require('fs'),
    http = require('http'),
    url = require('url');


var obj = {
    uri : 'http://comida.ig.com.br/pelomundo/p1237533839234.html'
},
    comidas = {},
    urls = {},
    content = fs.createWriteStream('conteudo.txt', {'flags': 'a'}),
    urlsFile = fs.createWriteStream('urls.txt', {'flags': 'a'}),
    collection = '4fc8cd230f03368412000035',
    counter = 0;
 
function crawl(obj, deep){
    request(obj, function (error, response, body) {
        if (error) {
            console.log('HTTP request error... '+error);
        }else{
            var window = jsdom.jsdom(body).createWindow();
            var $ = jquery(window.document);
            
            var headTitle = $.find('head title').html(),
                regiao,
                pais;
            if(headTitle != null && headTitle != ''){
                headTitle = headTitle.split('-');
                pais = headTitle[1];
                regiao =  headTitle[0];
            }
            /* Create object to export */
            obj = {
                'formKey' : '4fc8cd230f03368412000035',
                'dtAtualizacao' : '1/6/2012 16:01',
                'uri' : obj.uri,
                'titulo' : ($.find('#noticia h2').html()) ? $.find('#noticia h2').html().replace(/\n/g, '').replace(/\t/g, '').replace(/\r/g, '') : '',
                'foto' : ($.find('#noticia .foto-legenda img').attr('src')) ? $.find('#noticia .foto-legenda img').attr('src').replace(/\n/g, '').replace(/\t/g, '').replace(/\r/g, '').replace(/\&amp\;/g, '&') : '',
                'olho' : ($.find('#noticia h3').html()) ? $.find('#noticia h3').html().replace(/\n/g, '').replace(/\t/g, '').replace(/\r/g, '') : '',
                'credito' : ($.find('#noticia .barra-superior strong').html()) ? $.find('#noticia .barra-superior strong').html().replace(/\n/g, '').replace(/\t/g, '').replace(/\r/g, '') : '',
                'pais' : pais,
                'regiao' : regiao
            }
            
            var tags = '';
            $.find('#noticia .palavras-chave li a').each(function(){
                tags += jquery(this).html() + ',';
            })
            obj.tags = tags;
            
            /* Get links to crawl */
            $.find('a').each(function(){
                //complete url with domain
                thisURL = jquery(this).attr('href').replace('http://comida.ig.com.br', '');
                thisURL = 'http://comida.ig.com.br'+thisURL;
                    
                //edit this line to select links to continue crawling
                if(thisURL.indexOf('pelomundo') != -1 && thisURL.indexOf('rss.xml') == -1){
                    if(!(comidas[thisURL]) && !(urls[thisURL])){
                        urls[thisURL] = true;
                        counter++;
                    }
                }
            });
            
            
            /* Clean HTML */
            $.find('#noticia h2, #noticia h3,#noticia palavras-chave, #noticia .links-patrocinados, #noticia .ferramentas, #noticia .barra-superior, #noticia .formx, #noticia .compartilhar').remove();
            
            if($.find('#noticia .foto-legenda form fieldSET')[0]){
                $.find('#noticia .foto-legenda:first').remove();
            }
            obj.conteudo = ($.find('#noticia').html()) ? $.find('#noticia').html().replace(/\n/g, '').replace(/\t/g, '').replace(/\r/g, '').replace('//<![CDATA[', '').replace('//]]>', '') : '';
            
            /* Export new content */
            //console.log('adiciona no array comida: ' + obj.uri);
            comidas[obj.uri] = obj;
            
            if(obj.titulo != '' && obj.olho != ''){
                
                //save image
                if(obj.foto != ''){
                    var newNameImage = obj.titulo.replace(/\ /g, '-').toLowerCase().replace(/[^a-z]/gi, '') + '.gif';
                    getImg({
                        url: 'http://comida.ig.com.br'+obj.foto,
                        dest: 'images/'+newNameImage
                    },function(err){
                        console.log('image saved!')
                    });
                    obj.foto = newNameImage;
                }
                
                secao = obj.uri.replace('http://','');
                secao = secao.split('/');
                secao = secao[2];
                
                obj.secao = secao;
                
                str = JSON.stringify(obj);
                //importer - rock mongo
                content.write('db.getCollection("' + collection + '").insert('+ str+');\n', null, 'utf8');
                
                //json
                //content.write(str+',\n', null, 'utf8');
            }

            
            /* Remove URL from your crawler list */
            //console.log('Remove de urls: ' + obj.uri);
            urlsFile.write(obj.uri + '\n');
            delete urls[obj.uri];
            
            /* Craw deep link */
            if(deep){
                for(var u in urls) {
                    newUrl = u;
                    
                    if(!(comidas[newUrl])){
                        obj = {
                            uri : newUrl
                        }
                        console.log('Crawl: ' + newUrl);
                        crawl(obj, true);
                        break;
                    }
                }
            }
            
            console.log('##################### ' + counter);
            //console.log('#####################');
            
        }
    });   
}

var getImg = function(o, cb){
    var port    = o.port || 80,
        urlimage    = url.parse(o.url);
    
    
    var options = {
      host: urlimage.hostname,
      port: port,
      path: urlimage.pathname + urlimage.search
    };

    
    http.get(options, function(res) {
        //console.log("Got response: " + res.statusCode);
        res.setEncoding('binary')
        var imagedata = ''
        res.on('data', function(chunk){
            imagedata+= chunk; 
        });
        res.on('end', function(){
            fs.writeFile(o.dest, imagedata, 'binary', cb);
        });
    }).on('error', function(e) {
        console.log("Got error: " + e.message);
    });
}


crawl(obj, true);