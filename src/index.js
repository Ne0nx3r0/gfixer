import {readdir,rename} from 'node:fs/promises';
import { readFile, writeFile,readFileSync,mkdirSync,existsSync } from "node:fs";
import {  resolve, extname,dirname } from "node:path";

const HOMING_SEARCH_STR = "G28";
const Z_ALIGN_SEARCH_STR = "G34"
const Z_ALIGN_INSERT_STR = 'G34 ; Z align if supported';

const FIXED_FILE_APPEND = "_gfix";

const args = process.argv.slice(2);
const INPUT_DIR = args[0];
const OUTPUT_DIR = args[1];

const inputPath = resolve(INPUT_DIR);
const outputPath = resolve(OUTPUT_DIR); 

( async() => {
  for await (const filePath of getFiles(INPUT_DIR)){

    readFile(filePath, function (err, data) {
      if (err) throw err;

      console.log("---");
    
      const fileData = readFileSync(filePath);
            
      const outputFilePath = filePath.replace(inputPath,outputPath);
      const fixedOutputFilePathArr = outputFilePath.split(".");
      fixedOutputFilePathArr[fixedOutputFilePathArr.length-2] = fixedOutputFilePathArr[fixedOutputFilePathArr.length-2]+"_gfix";
      const fixedOutputFilePath = fixedOutputFilePathArr.join(".");

      if(extname(filePath) !== ".gcode"){
        console.log(`Not .gcode, just copying ${filePath}`);
        writeFileWithDirs(outputFilePath,fileData);
      }
      else if(data.includes(Z_ALIGN_SEARCH_STR)){
        console.log(`${Z_ALIGN_SEARCH_STR} found, just copying: ${filePath}`);
        writeFileWithDirs(outputFilePath,fileData);
      }
      else{
        const fileDataLines = fileData.toString().split("\n");

        for(let i=0;i<fileDataLines.length;i++){
          const line = fileDataLines[i];
  
          if(line.indexOf(HOMING_SEARCH_STR) == 0){
            console.log(`Homing line found at line ${i}: ${line}`);
  
            fileDataLines.splice(i+1,0,Z_ALIGN_INSERT_STR);
            const fixedFileData = fileDataLines.join("\n");

  
            console.log(`Writing fixed ${fixedOutputFilePath}`);
  
            writeFileWithDirs(fixedOutputFilePath,fixedFileData);
  
            break;
          }
        }

        console.log(`Missing ${Z_ALIGN_SEARCH_STR}, will fix: ${filePath}`);
      }      
    });
  }
})();

function writeFileWithDirs(path,data){
  const fileOutputDir = dirname(path);
  mkdirSync(fileOutputDir, {recursive:true});

  writeFile(path, data, `utf8`, function (err) {
    if (err) return console.log(err);

    console.log(`Wrote ${path}`)
  });
}


async function* getFiles(dir) {
  const dirents = await readdir(dir, { withFileTypes: true });
  for (const dirent of dirents) {
    const res = resolve(dir, dirent.name);
    if (dirent.isDirectory()) {
      yield* getFiles(res);
    } else {
      yield res;
    }
  }
}