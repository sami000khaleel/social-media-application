// [NEW] file: pictures for the demo data, drawn as SVG (no real photos of anyone)
// Pictures for the seed data, drawn as SVG so no real photo of anyone is needed.
// Every function returns the text of one .svg file.
const W=1200,H=800
// [background, soft, main, dark, light]
const PALETTE={
    tech:['#0f2542','#1c4274','#3987e5','#0a1a30','#cde2fb'],
    sport:['#fbe9df','#f6c3a8','#eb6834','#7a2e10','#ffffff'],
    business:['#e4f6ee','#a9e2c9','#1baf7a','#0b5c40','#ffffff'],
    politics:['#fdf3d6','#f7d67a','#eda100','#6b4a00','#ffffff'],
    entertainment:['#3a1226','#6e2347','#e87ba4','#22091a','#fbd9e6'],
}
const svg=(body,w=W,h=H)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${body}</svg>`
const pick=(rng,list)=>list[Math.floor(rng()*list.length)]
const between=(rng,a,b)=>a+rng()*(b-a)

const MOTIFS={
    tech:[
        // a code editor window
        (rng,[bg,soft,main,dark,light])=>{
            let lines=''
            let y=250
            for (let i = 0; i < 9; i++) {
                let x=250+pick(rng,[0,40,40,80])
                const parts=1+Math.floor(rng()*3)
                for (let j = 0; j < parts; j++) {
                    const w=between(rng,60,220)
                    lines+=`<rect x="${x}" y="${y}" width="${w}" height="16" rx="8" fill="${pick(rng,[main,light,soft,'#eda100','#e87ba4'])}" opacity="${j?0.75:1}"/>`
                    x+=w+18
                }
                y+=44
            }
            return `<rect width="${W}" height="${H}" fill="${bg}"/><rect x="180" y="120" width="840" height="560" rx="24" fill="${dark}"/><rect x="180" y="120" width="840" height="70" rx="24" fill="${soft}"/><rect x="180" y="160" width="840" height="30" fill="${soft}"/><circle cx="225" cy="155" r="10" fill="#e66767"/><circle cx="258" cy="155" r="10" fill="#eda100"/><circle cx="291" cy="155" r="10" fill="#1baf7a"/>${lines}`
        },
        // boxes and arrows
        (rng,[bg,soft,main,dark,light])=>{
            const nodes=[[220,400],[520,220],[520,580],[840,400],[1010,220]]
            const link=(a,b)=>`<path d="M${a[0]} ${a[1]} C ${(a[0]+b[0])/2} ${a[1]}, ${(a[0]+b[0])/2} ${b[1]}, ${b[0]} ${b[1]}" stroke="${light}" stroke-width="4" fill="none" opacity="0.5"/>`
            let out=`<rect width="${W}" height="${H}" fill="${bg}"/>`
            for (let x = 60; x < W; x+=60) for (let y = 60; y < H; y+=60) out+=`<circle cx="${x}" cy="${y}" r="2" fill="${soft}"/>`
            out+=link(nodes[0],nodes[1])+link(nodes[0],nodes[2])+link(nodes[1],nodes[3])+link(nodes[2],nodes[3])+link(nodes[3],nodes[4])
            nodes.forEach((n,i)=>{out+=`<rect x="${n[0]-90}" y="${n[1]-50}" width="180" height="100" rx="18" fill="${i===3?main:soft}"/><rect x="${n[0]-60}" y="${n[1]-18}" width="${between(rng,60,120)}" height="12" rx="6" fill="${light}"/><rect x="${n[0]-60}" y="${n[1]+8}" width="${between(rng,40,90)}" height="12" rx="6" fill="${light}" opacity="0.5"/>`})
            return out
        },
    ],
    sport:[
        // a football pitch from above
        (rng,[bg,soft,main,dark,light])=>{
            let out=`<rect width="${W}" height="${H}" fill="#2f8f4e"/>`
            for (let i = 0; i < 8; i++) out+=`<rect x="${i*150}" width="75" height="${H}" fill="#2a8346"/>`
            out+=`<g fill="none" stroke="#fff" stroke-width="6" opacity="0.9"><rect x="70" y="70" width="1060" height="660"/><path d="M600 70V730"/><circle cx="600" cy="400" r="110"/><rect x="70" y="230" width="170" height="340"/><rect x="960" y="230" width="170" height="340"/><rect x="70" y="320" width="60" height="160"/><rect x="1070" y="320" width="60" height="160"/></g><circle cx="600" cy="400" r="8" fill="#fff"/>`
            for (let i = 0; i < 10; i++) out+=`<circle cx="${between(rng,150,1050)}" cy="${between(rng,130,670)}" r="16" fill="${i%2?main:'#fff'}" stroke="${dark}" stroke-width="3"/>`
            return out
        },
        // a running track
        (rng,[bg,soft,main,dark,light])=>{
            let out=`<rect width="${W}" height="${H}" fill="${bg}"/>`
            for (let i = 0; i < 6; i++) { const r=120+i*42; out+=`<rect x="${600-360-i*42}" y="${400-r}" width="${720+i*84}" height="${r*2}" rx="${r}" fill="none" stroke="${i%2?main:soft}" stroke-width="34"/>` }
            out+=`<rect x="${600-290}" y="${400-70}" width="580" height="140" rx="70" fill="#2f8f4e"/>`
            for (let i = 0; i < 4; i++) out+=`<circle cx="${between(rng,300,900)}" cy="${pick(rng,[400-141,400-183,400+141,400+183])}" r="13" fill="${dark}"/>`
            return out
        },
    ],
    business:[
        // bars and a line
        (rng,[bg,soft,main,dark,light])=>{
            let out=`<rect width="${W}" height="${H}" fill="${bg}"/>`
            for (let i = 0; i < 4; i++) out+=`<path d="M150 ${220+i*130}H1050" stroke="${soft}" stroke-width="2"/>`
            let v=between(rng,120,220), pts=[]
            for (let i = 0; i < 9; i++) {
                v=Math.max(80,Math.min(470,v+between(rng,-40,90)))
                const x=180+i*98
                out+=`<rect x="${x}" y="${640-v}" width="54" height="${v}" rx="8" fill="${i===8?dark:main}"/>`
                pts.push(`${x+27},${640-v-between(rng,40,90)}`)
            }
            return out+`<polyline points="${pts.join(' ')}" fill="none" stroke="${dark}" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/><path d="M150 642H1050" stroke="${dark}" stroke-width="4"/>`
        },
        // a skyline
        (rng,[bg,soft,main,dark,light])=>{
            let out=`<rect width="${W}" height="${H}" fill="${bg}"/><circle cx="${between(rng,250,950)}" cy="230" r="90" fill="${soft}"/>`
            let x=40
            while(x<W-60){
                const w=between(rng,70,150),h=between(rng,180,520)
                out+=`<rect x="${x}" y="${H-h}" width="${w}" height="${h}" fill="${pick(rng,[main,dark,soft])}"/>`
                for (let wy = H-h+26; wy < H-30; wy+=44) for (let wx = x+16; wx < x+w-22; wx+=30) if(rng()>0.35) out+=`<rect x="${wx}" y="${wy}" width="14" height="20" fill="${light}" opacity="0.55"/>`
                x+=w+10
            }
            return out
        },
    ],
    politics:[
        // seats of a parliament
        (rng,[bg,soft,main,dark,light])=>{
            let out=`<rect width="${W}" height="${H}" fill="${bg}"/>`
            const colors=['#2a78d6','#1baf7a',main,'#eb6834','#e87ba4']
            const cuts=[0.18,0.42,0.62,0.85,1].map(c=>c+between(rng,-0.04,0.04))
            for (let row = 0; row < 6; row++) {
                const r=190+row*56, n=14+row*4
                for (let i = 0; i < n; i++) {
                    const t=i/(n-1), a=Math.PI*(1-t)
                    const color=colors[cuts.findIndex(c=>t<=c)]||colors[4]
                    out+=`<circle cx="${600+Math.cos(a)*r}" cy="${640-Math.sin(a)*r}" r="17" fill="${color}"/>`
                }
            }
            return out+`<rect x="520" y="610" width="160" height="60" rx="12" fill="${dark}"/>`
        },
        // a ballot box
        (rng,[bg,soft,main,dark,light])=>{
            let out=`<rect width="${W}" height="${H}" fill="${bg}"/><rect x="330" y="380" width="540" height="300" rx="26" fill="${main}"/><rect x="330" y="380" width="540" height="70" rx="26" fill="${dark}"/><rect x="480" y="404" width="240" height="20" rx="10" fill="${bg}"/>`
            out+=`<g transform="rotate(${between(rng,-12,12)} 600 300)"><rect x="500" y="170" width="200" height="250" rx="12" fill="#fff" stroke="${dark}" stroke-width="5"/>`
            for (let i = 0; i < 4; i++) out+=`<rect x="530" y="${205+i*46}" width="26" height="26" rx="5" fill="none" stroke="${dark}" stroke-width="4"/><rect x="572" y="${212+i*46}" width="${between(rng,50,100)}" height="12" rx="6" fill="${soft}"/>`
            return out+`<path d="M534 ${258}l8 9 14-17" stroke="${dark}" stroke-width="5" fill="none" stroke-linecap="round"/></g>`
        },
    ],
    entertainment:[
        // a record
        (rng,[bg,soft,main,dark,light])=>{
            let out=`<rect width="${W}" height="${H}" fill="${bg}"/><rect x="170" y="130" width="540" height="540" rx="14" fill="${main}"/><circle cx="440" cy="400" r="${between(rng,90,170)}" fill="${soft}"/><circle cx="${between(rng,330,560)}" cy="${between(rng,280,520)}" r="60" fill="${light}" opacity="0.8"/><circle cx="760" cy="400" r="250" fill="#111"/>`
            for (let r = 110; r < 250; r+=18) out+=`<circle cx="760" cy="400" r="${r}" fill="none" stroke="#2c2c2c" stroke-width="3"/>`
            return out+`<circle cx="760" cy="400" r="86" fill="${light}"/><circle cx="760" cy="400" r="12" fill="#111"/>`
        },
        // stage lights and sound bars
        (rng,[bg,soft,main,dark,light])=>{
            let out=`<rect width="${W}" height="${H}" fill="${dark}"/>`
            for (let i = 0; i < 4; i++) { const x=180+i*280; out+=`<path d="M${x} 0L${x-170+between(rng,-40,40)} ${H}H${x+170+between(rng,-40,40)}Z" fill="${pick(rng,[main,light,soft])}" opacity="0.22"/><circle cx="${x}" cy="20" r="26" fill="${light}"/>` }
            for (let i = 0; i < 26; i++) { const h=between(rng,40,330); out+=`<rect x="${110+i*38}" y="${680-h}" width="22" height="${h}" rx="11" fill="${i%3?main:light}"/>` }
            return out
        },
    ],
}
function postImage(category,rng){
    const palette=PALETTE[category]
    return svg(pick(rng,MOTIFS[category])(rng,palette))
}
// a faceless flat avatar: background, shoulders, neck, head and one of a few hair shapes
function avatar(rng){
    const bg=pick(rng,['#cde2fb','#f6c3a8','#a9e2c9','#f7d67a','#fbd9e6','#d9d2f7','#cfe8ef'])
    const skin=pick(rng,['#f6d3b8','#eebf9a','#d9a273','#b97a50','#8d5a3b','#6a4129'])
    const hair=pick(rng,['#1f1a17','#3b2a20','#6b4423','#a8672f','#d6a44c','#8c8c8c','#2b2b45'])
    const top=pick(rng,['#2a78d6','#eb6834','#1baf7a','#eda100','#e87ba4','#6250d6','#2f3542','#ffffff'])
    const style=Math.floor(rng()*5)
    const hairs=[
        `<path d="M72 96c0-40 22-62 56-62s56 22 56 62c-10-22-28-34-56-34s-46 12-56 34z" fill="${hair}"/>`,
        `<path d="M68 104c-6-48 20-74 60-74s66 26 60 74c-6-26-22-44-60-44s-54 18-60 44z" fill="${hair}"/><rect x="66" y="96" width="18" height="76" rx="9" fill="${hair}"/><rect x="172" y="96" width="18" height="76" rx="9" fill="${hair}"/>`,
        `<circle cx="128" cy="62" r="46" fill="${hair}"/>`,
        `<path d="M74 92c2-36 24-54 54-54s52 18 54 54c-16-14-34-20-54-20s-38 6-54 20z" fill="${hair}"/><circle cx="128" cy="30" r="18" fill="${hair}"/>`,
        `<path d="M76 88c4-30 24-46 52-46s48 16 52 46c-14-10-32-14-52-14s-38 4-52 14z" fill="${hair}" opacity="0.9"/>`,
    ]
    return svg(`<rect width="256" height="256" fill="${bg}"/><path d="M28 256c0-52 44-78 100-78s100 26 100 78z" fill="${top}"/><rect x="108" y="150" width="40" height="46" rx="18" fill="${skin}"/><ellipse cx="128" cy="108" rx="48" ry="54" fill="${skin}"/>${hairs[style]}`,256,256)
}
// soft hills for profile and community covers
function cover(rng,category){
    const sets={tech:['#cde2fb','#86b6ef','#3987e5','#1c5cab'],sport:['#fbe9df','#f6c3a8','#eb6834','#b8481c'],business:['#e4f6ee','#a9e2c9','#1baf7a','#0b7a55'],politics:['#fdf3d6','#f7d67a','#eda100','#a87200'],entertainment:['#fbe4ee','#f3b3cd','#e87ba4','#b0456f']}
    const c=category?sets[category]:pick(rng,Object.values(sets))
    let out=`<rect width="1500" height="500" fill="${c[0]}"/><circle cx="${between(rng,200,1300)}" cy="${between(rng,110,200)}" r="${between(rng,50,90)}" fill="#fff" opacity="0.75"/>`
    for (let layer = 0; layer < 3; layer++) {
        let d=`M0 500V${260+layer*70}`
        for (let x = 0; x <= 1500; x+=250) d+=` Q${x+125} ${between(rng,180,330)+layer*70} ${x+250} ${between(rng,240,320)+layer*70}`
        out+=`<path d="${d}V500Z" fill="${c[layer+1]}"/>`
    }
    return svg(out,1500,500)
}
module.exports={postImage,avatar,cover}
