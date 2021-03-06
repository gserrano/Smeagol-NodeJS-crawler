var jsdom = require("jsdom"),
    jquery = require("jquery"),
    request = require("request"),
    fs     = require('fs'),
    mongoose = require('mongoose'),
    db = mongoose.connect('mongodb://localhost/crawler'),
    fs = require('fs'),
    http = require('http'),
    url = require('url');

/*Prototype*/
crawler_obj = {
    callback : function(data){
        //callback sucesso ao final do crawler
        console.log(data);
    },
    patterns : {
        'http://letras.mus.br/([^/].)*?/' : {
            id : "artista",
            do_extraction : function(body){
                //extracao generica a partir do body caso prefira manipular diversar informacoes
                //caso nao, usar o atributo query
                nome_artista = jquery(body).find("#identificador_artista").html();

                return {artista : nome_artista};
            },
            query : {
                _open_link: {find : "#ico_fotos a",callback : function(el){return jquery(el).attr("href")}},
                _each_link: {find : ".cnt_listas li a", callback:function(els){
                        var links = []; 
                        els.each(function(i,item){
                            links.push(jquery(item).attr("href"));
                        });
                        return links;
                    }
                }
            }
        },
        'http://letras.mus.br/.*?/fotos.html' : {
            id : "fotos",
            do_extraction : function(body){
                //extracao generica a partir do body caso prefira manipular diversar informacoes
                //caso nao, usar o atributo query
                fotos = jquery(body).find("#ul.fotos img");

                ret = [];
                el.each(function(i,item){
                    ret.push(jquery(item).attr("src"));
                })

                return ret
            },
            query : {
                fotos : { find : "ul.fotos img", callback : function(el){

                        ret = [];
                        el.each(function(i,item){
                            ret.push(jquery(item).attr("src"));
                        })

                        return ret
                    }
                }
            }
        },
        'http://letras.mus.br/.*?/.*?/' : {
            id : "musicas",
            query : {
                titulo : {find : "#identificador_musica", callback : function(el){return el.html()}},
                exibicoes : {find : ".exibicoes-rating strong", callback : function(el){return el.html()}}
            }
        }
    }
};

var crawler = {};

//crawlea a partir de obj.link e response
crawler.open_link = function(obj){
    
    link = obj.link;

    if(link.search("http://") == -1)
        link = "http://" + obj.response.request.uri.hostname + "/" + link

    doCrawl({uri:link},false);
}

crawler.each_link = function(obj){

    for(var i in obj.link){
        crawler.open_link({link:obj.link[i],response:obj.response});
    }
}


data = {};

function doCrawl(obj,callbackSucesso){

    /*Faz o request*/
    request(obj, function (error, response, body) {
        if (error) {
            console.log('HTTP request error... '+error);
        }else{

            var href=response.request.uri.href;
            var window = jsdom.jsdom(body).createWindow();
            var $ = jquery(window.document);
            
            //percorre cada propriedade do crawler_obj
            for(var i in crawler_obj["patterns"]){

                crawler_page_properties = crawler_obj["patterns"][i];

                //regex de pattern de url
                re = new RegExp("^" + i + "$","gi");

                //se casar a url atual com algum pattern crawlea o DOM
                if(re.exec(href)){

                    data_2_store = {}
                    page_crawl_id = crawler_page_properties["id"];

                    if(typeof crawler_page_properties.do_extraction == "function"){
                        data_2_store = crawler_page_properties.do_extraction($);
                    }

                    //for para os campos a serem extraidos
                    for(var field in crawler_page_properties["query"]){

                        //campo a ser buscado
                        dom_element_crawl = crawler_page_properties["query"][field];
                        dom_element_find = dom_element_crawl["find"];

                        //checagem de callback para tratamento
                        if(dom_element_crawl["callback"] && typeof dom_element_crawl["callback"] == "function")
                            dom_element_callback = dom_element_crawl["callback"];
                        else
                            dom_element_callback = function(el){return el}

                        //campos comecados com _ indicam operacoes do crawler
                        if(/^_/.exec(field)){

                            crawler[field.replace(/^_/,"")]({
                                link : dom_element_callback($.find(dom_element_find)),
                                response : response
                            })

                        }else{

                            data_2_store[field] = dom_element_callback($.find(dom_element_find));

                        }
                        
                    }

                    if(!data[page_crawl_id]){
                        data[page_crawl_id] = [];    
                    }

                    data[page_crawl_id].push(data_2_store);
                                        
                }

            }

        }

        console.log(data)
        console.log("=============================")

    });   

}

doCrawl({uri:"http://letras.mus.br/carrossel-2012/"},function(){console.log(data)});












    var obj = {
        uri : 'http://letras.mus.br/carrossel-2012/'
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


//crawl(obj, false);