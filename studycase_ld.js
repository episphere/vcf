initStudyCase = () => {
    var chroms = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', 'X', 'Y', 'MT']
    var htmls=''
    chroms.forEach( e => { htmls+=`<option value="${e}" >${e}</option>` })
    ld_chrom.innerHTML=htmls
}

initStudyCase()

calculate_probabilities_snp = (snp_info) => {
    var probs={}
    var j = 0
    var index_gen = 0
    snp_info.forEach( e => { if(e.length==3 && e.indexOf('|')==1 && index_gen==0){ index_gen=j; } j+=1  })
    if(index_gen!=0){
        var cnts={}
        var total = 0
        j=0
        snp_info.forEach( e => { 
            if(e.length==3 && e.indexOf('|')==1 && j>=index_gen ){ 
                if( e.split('|')[0] != e.split('|')[1] ){
                    e='mix'
                }
                if( ! Object.keys(cnts).includes(e) ){
                    cnts[e]=0
                }
                cnts[e]+=1 
                total+=1
            } 
            j+=1  
        })
        total *= 2 // Total number of chromosomes in the population
        
        for ( var k of ['0|0', 'mix', '1|1']){
            if( ! Object.keys(cnts).includes(k) ){
                cnts[k]=0
            }
        }
        
        for(var k of Object.keys(cnts)){
            probs['count_'+k] = cnts[k]
        }
        probs['p'] = ( (2*cnts['0|0']) + cnts['mix'] )/total
        probs['q'] = ( cnts['mix'] + (2*cnts['1|1']) )/total
    }
    return probs
}

calculate_ld = (snp1, snp2) => {
    var result = {'dl': -1, 'r2': -1}
    
    var index_gen = 0
    var j=0
    snp1.forEach( e => { if(e.length==3 && e.indexOf('|')==1 && index_gen==0){ index_gen=j; } j+=1  })
    if(index_gen!=0 && snp1.length == snp2.length){
        var cnts={}
        j=0
        var snp = snp1
        var snp_2=snp2
        if(snp1.length < snp2.length){
            snp=snp2
            snp_2=snp1
        }
        snp.forEach( e => { 
            if(e.length==3 && e.indexOf('|')==1 && j>=index_gen ){ 
                if( e.split('|')[0] != e.split('|')[1] ){
                    e='mix'
                }
                var f = snp_2[j]
                if(f!=undefined){
                    if( f.split('|')[0] != f.split('|')[1] ){
                        f='mix'
                    }
                    
                    var aux = []
                    
                    if(e=='0|0'){
                        if(f=='mix'){
                            aux.push('00')
                            aux.push('01')
                        }
                        if(f=='0|0'){
                            aux.push('00')
                        }
                        if(f=='1|1'){
                            aux.push('01')
                        }
                    } 
                    if(e=='1|1' ){
                        if(f=='mix'){
                            aux.push('10')
                            aux.push('11')
                        }
                        if(f=='0|0'){
                            aux.push('10')
                        }
                        if(f=='1|1'){
                            aux.push('11')
                        }
                    } 
                    if(e=='mix' ){
                        if(f=='mix'){
                            aux.push('00')
                            aux.push('01')
                            aux.push('10')
                            aux.push('11')
                        }
                        if(f=='0|0'){
                            aux.push('00')
                            aux.push('10')
                        }
                        if(f=='1|1'){
                            aux.push('01')
                            aux.push('11')
                        }
                    }
                    
                    for (var x of aux){
                        if( ! Object.keys(cnts).includes(x) ){
                            cnts[x]=0
                        }
                        cnts[x]+=1 
                    }
                }
            } 
            
            j+=1  
        })
        j*=2
        
        var probs1 = calculate_probabilities_snp(snp1)
        var probs2 = calculate_probabilities_snp(snp2)
        
        var result = {}
        result['chisq'] = 0
        for( var k of Object.keys(cnts) ){
            result['p'+k]=cnts[k]/j
            
            var p1=0
            var p2=0
            if(k[0]=='0'){
                p1=probs1['p']
            }
            if(k[0]=='1'){
                p1=probs1['q']
            }
            if(k[1]=='0'){
                p2=probs2['p']
            }
            if(k[1]=='1'){
                p2=probs2['q']
            }
            var expected = p1*p2*j
            console.log(k, expected)
            result['chisq'] += Math.pow( (cnts[k]-expected), 2)/expected
        }
        result['pvalue'] = jStat.chisquare.pdf( result['chisq'], 1 )
        
        result['d'] = (result['p00']*result['p11']) - (result['p01']*result['p10'])
        var denominator = Math.min(probs1['p']*probs2['q'], probs1['q']*probs2['p'])  // dmax
        if( result['d']<0 ){
            denominator = Math.max(probs1['p']*probs2['q'], probs1['q']*probs2['p']) // dmin
        }
        result['dl'] = result['d']/denominator
        var denominator_r2 = probs1['p']*probs1['q']*probs2['p']*probs2['q']
        result['r2'] = result['d']/denominator_r2
    }
    
    return result
}

perform_ld = () => {
    var ld_result={}

    var chrom = ld_chrom.value
    var url=`http://ftp.1000genomes.ebi.ac.uk/vol1/ftp/release/20130502/ALL.chr${chrom}.phase3_shapeit2_mvncall_integrated_v5b.20130502.genotypes.vcf.gz`
    if(chrom=='MT'){
        url='http://ftp.1000genomes.ebi.ac.uk/vol1/ftp/release/20130502/ALL.chrMT.phase3_callmom-v0_4.20130502.genotypes.vcf.gz'
    }
    if(chrom=='Y'){
        url='http://ftp.1000genomes.ebi.ac.uk/vol1/ftp/release/20130502/ALL.chrY.phase3_integrated_v2b.20130502.genotypes.vcf.gz'
    }
    if(chrom=='X'){
        url='http://ftp.1000genomes.ebi.ac.uk/vol1/ftp/release/20130502/ALL.chrX.phase3_shapeit2_mvncall_integrated_v1c.20130502.genotypes.vcf.gz'
    }
    
    var start = ld_start.value
    var end = ld_end.value
    if(start < end){
        action_ld.disabled=true
        action_ld.innerHTML='Analyzing ...'
        
        Vcf(url).then( async (value) => {
            var vld = value
            var queries=[]
            for( var i=start; i<=end; i++){
                queries.push(chrom+','+i)
            }
            var snps={}
            var info = await Promise.all( queries.map( async e => {
                var r = await vld.query(e)
                //console.log(e, '----', r)
                if(r!=undefined){
                    if(r.hit.length>0){
                        r=r.hit[0]
                        var ide = r[2]
                        if(r[2]=='.'){
                            ide=r[0]+'_'+r[1]
                        }
                        snps[ide] = r
                        return ide
                    }
                }
                
                return null
            } ) )
            console.log(snps)
            console.log(info)
            var keys = Object.keys(snps)
            var i=0
            for (var k of keys){
                var j=0
                for (var v of keys){
                    if(i<j){
                        ld_result[k+'_'+v] = calculate_ld(snps[k], snps[v])
                    }
                    j+=1
                }
                i+=1
            }
            
            action_ld.disabled=false
            action_ld.innerHTML='Analyze'
            
            console.log(ld_result)
            
            return ld_result
        })
    }
    else{
        alert('End position must be higher than the start position')
        return ld_result
    }
    
}


if(typeof(jStat)=="undefined"){
    vcf.loadScript('https://cdn.jsdelivr.net/npm/jstat@latest/dist/jstat.min.js')
}
