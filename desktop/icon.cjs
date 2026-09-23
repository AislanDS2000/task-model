const { app, nativeImage } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
app.whenReady().then(() => {
  const source = nativeImage.createFromPath(path.join(__dirname, '../public/brand/task-model-mark.png'));
  if (source.isEmpty()) throw Error('Logo não encontrada');
  const bitmap = source.toBitmap();
  if (bitmap[3] !== 0) throw Error('O fundo da logo deve ser transparente');
  const sizes = [16,32,48,64,128,256]; const images = sizes.map(size => source.resize({width:size,height:size,quality:'best'}).toPNG());
  const header = Buffer.alloc(6 + sizes.length*16); header.writeUInt16LE(1,2); header.writeUInt16LE(sizes.length,4);
  let offset = header.length;
  images.forEach((png,i) => { const base=6+i*16; header[base]=sizes[i]===256 ? 0:sizes[i]; header[base+1]=header[base]; header.writeUInt16LE(1,base+4); header.writeUInt16LE(32,base+6); header.writeUInt32LE(png.length,base+8); header.writeUInt32LE(offset,base+12); offset+=png.length; });
  fs.writeFileSync(path.join(__dirname,'../public/brand/task-model.ico'),Buffer.concat([header,...images]));
  console.log('Ícone ICO criado a partir da logo existente.'); app.quit();
}).catch(e=>{console.error(e); app.exit(1);});
