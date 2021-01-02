import { getAverageColor } from 'fast-average-color-node';
import FastAverageColor from 'fast-average-color';
import mergeImages  from 'merge-images';
import fs from "fs";
import canvas from 'canvas';
import sizeOf from 'image-size';
import sharp from 'sharp';


const { Canvas, Image, loadImage, createCanvas } = canvas;
const fac = new FastAverageColor();

// ------------------------ Image Definition --------------------------------- //
const image = await loadImage('./imagesIn/in.jpg');
const naturalWidth = image.width;
const naturalHeight = image.height;
const imageCanvas = createCanvas(naturalWidth, naturalHeight);
const context = imageCanvas.getContext('2d');
context.drawImage(image, 0, 0);
// ------------------------ Image Definition --------------------------------- //


const { width, height } = sizeOf('./imagesIn/in.jpg');
const filePath = "./images";
const filePathResized = "./imagesResized";
const mosaicSquareDimension = 5;

var colorMap = {};
var colorMapImage = {};
var mosaicColors = {};
var images = [];
var imageResized = [];

const defineColorMapMosaicImage = () => {
    for(var y = 0; y < height; y += mosaicSquareDimension) {
        for(var x = 0; x < width; x += mosaicSquareDimension) {
            let colorValue = getAreaColor(x, y, mosaicSquareDimension, mosaicSquareDimension).value;
            colorMapImage[x+"-"+y] = {
                "r": colorValue[0],
                "g": colorValue[1],
                "b": colorValue[2]
            }
        }
    }
};

const defineFinalColorMap = () => {
    const colorMapKeys = Object.keys(colorMapImage);
    const mosaicKeys = Object.keys(mosaicColors);

    colorMapKeys.map(coords => {
        var minDiff;
        var imageToUse;
        mosaicKeys.map((imageRef, index) => {
            let redImage = colorMapImage[coords].r;
            let greenImage = colorMapImage[coords].g;
            let blueImage = colorMapImage[coords].b;

            let redMosaic = mosaicColors[imageRef].r;
            let greenMosaic = mosaicColors[imageRef].g;
            let blueMosaic = mosaicColors[imageRef].b;

            const diff = Math.abs((redImage - redMosaic) + (greenImage - greenMosaic) + (blueImage - blueMosaic));

            if(diff < minDiff || index === 0) {
                minDiff = diff;
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
}

const getMosaicImageColor = (aImagesPath) => {
    return new Promise((resolve, reject) => {
        const colorPromises = aImagesPath.map((imagePath) => {
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

        Promise.all(colorPromises)
        .then((aColors) => {
            aColors.map(color => {
                mosaicColors = {...mosaicColors, ...color};
            })
            resolve();
        })
        .catch((err) => {
            reject(err);
        })
    });
};

const resizeImage = (imagePath, options) => {
    return new Promise((resolve, reject) => {
        options = options ? options : { width: mosaicSquareDimension, height: mosaicSquareDimension };
        sharp(imagePath)
        .resize(options)
        .toBuffer()
        .then(data => {
            const base64String = data.toString("base64");
            imagePath = redifinePath(imagePath);
            imageResized.push(imagePath);
            fs.writeFile(imagePath, base64String, 'base64', function(err) {
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
    return new Promise((resolve, reject) => {
        let imagesToMerge = [];
        for(var y = 0; y < height; y += mosaicSquareDimension) {
            for(var x = 0; x < width; x += mosaicSquareDimension) {
                imagesToMerge.push(Object.assign({}, {
                    src:  colorMap[x+"-"+y].path,
                    x: x,
                    y: y,
                }));
            }
        }

        mergeImages(imagesToMerge, {
            width: width,
            height: height,
            Canvas: Canvas,
            Image: Image
        }).then(base64String => {
            base64String = base64String.split(",")[1];
            fs.writeFile("./imagesOut/out.jpg", base64String, 'base64', function(err) {
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

fs.readdir(filePath, function (err, files) {
    if (err) {
        return console.error('Unable to scan directory: ' + err);
    }

    files.map((file) => {
        return images.push(filePath +"/"+ file);
    });

    getMosaicImageColor(images)
    .then(() => {
        let imageResizingPromise = images.map((filePath) => {
            return resizeImage(filePath);
        })
        Promise.all(imageResizingPromise)
        .then(() => {
            console.log("Resize success!");
            defineColorMapMosaicImage();
            defineFinalColorMap();
            generateMosaic(imageResized)
            .then(() => {
                console.log("Images merged!");
            })
            .catch((err) => {
                console.error(err);
            });
        })
        .catch((err) => {
            console.error(err);
        });    
    });
});


