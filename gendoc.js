
gendoc={}

gendoc.getLines= async (url) =>{
    let r = await fetch(url);
    var t = await r.text()
    t=t.split('\n')
    return t
}


