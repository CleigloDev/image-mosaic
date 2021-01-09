import { getAverageColor } from 'fast-average-color-node';
import FastAverageColor from 'fast-average-color';
import mergeImages  from 'merge-images';
import fs from "fs";
import canvas from 'canvas';
import sharp from 'sharp';


const { Canvas, Image, loadImage, createCanvas } = canvas;
const fac = new FastAverageColor();
const imageToMosaicPath = './imagesIn/in.jpg';
const imageOutputPath = './imagesOut/';
const outputFileName = 'out.jpg';
const filePath = "./images/";
const filePathResized = "./imagesResized/";

// ------------------------ Image Definition --------------------------------- //
const image = await loadImage(imageToMosaicPath);
const width = image.width;
const height = image.height;
const imageCanvas = createCanvas(width, height);
const context = imageCanvas.getContext('2d');
context.drawImage(image, 0, 0);
// ------------------------ Image Definition --------------------------------- //

const mosaicSquareDimension = 110;
const frameToAnalize = 30;

var colorMap = {};
var colorMapImage = {};
var mosaicColors = {};
var images = [];
var imageResized = [];

const defineColorMapMosaicImage = () => {
    console.info("DEFINING COLOR MAP");
    return new Promise((resolve) => {
        for(var y = 0; y < height; y += frameToAnalize) {
            for(var x = 0; x < width; x += frameToAnalize) {
                let colorValue = getAreaColor(x, y, frameToAnalize, frameToAnalize).value;
                colorMapImage[x+"-"+y] = {
                    "r": colorValue[0],
                    "g": colorValue[1],
                    "b": colorValue[2]
                };
                console.info("COLOR MAP COORDS: " + x+"-"+y);
            }
        }
        resolve();
    });
};

const defineFinalColorMap = () => {
    console.info("DEFINING FINAL COLOR MAP");
    const colorMapKeys = Object.keys(colorMapImage);
    const mosaicKeys = Object.keys(mosaicColors);

    colorMapKeys.map(coords => {
        var minRedDiff = 0;
        var minGreenDiff = 0;
        var minBlueDiff = 0;
        var imageToUse = null;
        mosaicKeys.map((imageRef, index) => {
            let redImage = colorMapImage[coords].r;
            let greenImage = colorMapImage[coords].g;
            let blueImage = colorMapImage[coords].b;

            let redMosaic = mosaicColors[imageRef].r;
            let greenMosaic = mosaicColors[imageRef].g;
            let blueMosaic = mosaicColors[imageRef].b;

            const redDiff = Math.abs((redImage - redMosaic));
            const greenDiff = Math.abs((greenImage - greenMosaic));
            const blueDiff = Math.abs((blueImage - blueMosaic));

            if((redDiff <= minRedDiff && greenDiff <= minGreenDiff && blueDiff <= minBlueDiff) 
                || index === 0) {
                minRedDiff = redDiff;
                minGreenDiff = greenDiff;
                minBlueDiff = blueDiff;
                imageToUse = imageRef;
            }
        });

        colorMap[coords] = {
		    "path": imageToUse
        };
    });
};

const getAreaColor = (xCoords, yCoords, frameWidth, frameHeight) => {
    const imageData = context.getImageData(xCoords, yCoords, frameWidth, frameHeight);
    return fac.prepareResult(fac.getColorFromArray4(imageData.data, {}));
};

const redifinePath = (path) => {
    return filePathResized+path.split(filePath)[1];
};

const getMosaicImageColor = (aImagesPath) => {
    console.info("DEFINING MOSAIC COLOR MAP");
    return new Promise((resolve, reject) => {
        const colorPromises = aImagesPath.map((imagePath, index) => {
            console.info("processing image n°: " + index);
            return new Promise((resolve, reject) => {
                getAverageColor(imagePath)
                .then(color => {
                    console.table(color);
                    let imageColors = {};
                    imagePath = redifinePath(imagePath);
                    imageColors[imagePath] = {
                        "r": color.value[0],
                        "g": color.value[1],
                        "b": color.value[2]
                    };
                    resolve(imageColors);
                })
                .catch(err => {
                    console.error(err);
                    reject(err);
                });
            });
        });

        console.info("DETECTING COLOR OF IMAGES");

        Promise.all(colorPromises)
        .then((aColors) => {
            aColors.map(color => {
                mosaicColors = {...mosaicColors, ...color};
            });
            console.info("COLOR DETECTED");
            resolve();
        })
        .catch((err) => {
            reject(err);
        })
    });
};

const resizeImage = (imagePath, options) => {
    console.info("Resizing image: " + imagePath);
    return new Promise((resolve, reject) => {
        options = options ? options : { width: mosaicSquareDimension, height: mosaicSquareDimension };
        sharp(imagePath)
        .resize(options)
        .toBuffer()
        .then(data => {
            const base64String = data.toString("base64");
            imagePath = redifinePath(imagePath);
            imageResized.push(imagePath);
            fs.writeFile(imagePath, base64String, 'base64', (err) => {
                if (err) {
                    console.error(err);
                    reject(err);
                }
                console.info('The file has been saved!');
                resolve();
            });
        })
        .catch(err => { 
            console.error(err);
            reject(err);
        });
    });
};

const generateMosaic = () => {
    console.info("GENERATING MOSAIC IMAGE");
    return new Promise((resolve, reject) => {
        let imagesToMerge = [];
        for(var y = 0; y < height; y += frameToAnalize) {
            for(var x = 0; x < width; x += frameToAnalize) {
                imagesToMerge.push(Object.assign({}, {
                    src: colorMap[x+"-"+y].path,
                    x: (x/frameToAnalize)*mosaicSquareDimension,
                    y: (y/frameToAnalize)*mosaicSquareDimension,
                }));
            }
        }

        mergeImages(imagesToMerge, {
            width: (width/frameToAnalize)*mosaicSquareDimension,
            height: (height/frameToAnalize)*mosaicSquareDimension,
            Canvas: Canvas,
            Image: Image
        }).then(base64String => {
            base64String = base64String.split(",")[1];
            fs.writeFile(imageOutputPath+outputFileName, base64String, 'base64', (err) => {
                if (err) {
                    console.error(err);
                    reject(err);
                }
                console.info('The file has been saved!');
                resolve();
            });
        })
        .catch(err => { 
            console.error(err);
            reject(err);
        });
    });
};

const compressOutput = (imageOutPath, fileName) => {
    console.info('COMPRESSING OUTPUT IMAGE');
    loadImage(imageOutPath+fileName).then((imageOut) => {
        const canvas = createCanvas(width, height);
        canvas.getContext("2d").drawImage(imageOut, 0, 0, width, height);
        const imageDataUrl = canvas.toDataURL('image/jpeg', 1);
        const base64String = imageDataUrl.split(",")[1];
        const fileNameSplitted = fileName.split('.');
        fileNameSplitted[0] += "COMPRESSED";
        fileName = fileNameSplitted.join('.');
        fs.writeFile(imageOutPath+fileName, base64String, 'base64', (err) => {
            if (err) {
                console.error(err);
            }
            console.info(imageOutPath+fileName + ' has been saved');
        });
    })
    .catch((err) => {
        console.error('Compression failed with error: \n'+err);
    });
};

fs.readdir(filePath, (err, files) => {
    if (err) {
        return console.error('Unable to scan directory: ' + err);
    }

    files.map((file) => {
        return images.push(filePath + file);
    });


    let imageResizingPromise = images.map((filePath) => {
        return resizeImage(filePath);
    });

    let promiseColorMap = defineColorMapMosaicImage();
    let promiseMosaicImageColor = getMosaicImageColor(images);

    let allPromises = [...imageResizingPromise, 
        promiseColorMap,
        promiseMosaicImageColor
    ];

    Promise.all(allPromises)
    .then(() => {
        defineFinalColorMap();
        generateMosaic()
        .then(() => {
            console.log("Images merged!");
            compressOutput(imageOutputPath, outputFileName);
        })
        .catch((err) => {
            console.error(err);
        });
    })
    .catch((err) => {
        console.error(err);
    });    
});


