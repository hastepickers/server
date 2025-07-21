const fs = require("fs");
const path = require("path");

const fonts = [
  { name: "LufgaRegular", file: "../fonts/LufgaRegular.ttf" },
  { name: "LufgaMedium", file: "../fonts/LufgaMedium.ttf" },
  { name: "LufgaSemiBold", file: "../fonts/LufgaSemiBold.ttf" },
  { name: "LufgaBold", file: "../fonts/LufgaBold.ttf" },
];

const outputDir = path.join(__dirname, "../fonts/base64");

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fonts.forEach((font) => {
  const fontPath = path.join(__dirname, font.file);
  const base64 = fs.readFileSync(fontPath).toString("base64");
  const outputPath = path.join(outputDir, `${font.name}.txt`);
  fs.writeFileSync(outputPath, base64);
  console.log(`✅ Converted ${font.name} to Base64: ${outputPath}`);
});
