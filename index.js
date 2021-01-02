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
const mosaicSquareDimension = 25;

var colorMap = {};
var mosaicColors = {};
const testImagesPath = ['./images/test.jpg', './images/test1.jpg'];

const defineColorMapMosaicImage = () => {
    for(var y = 0; y < height; y += 25) {
        for(var x = 0; x < width; x += 25) {
            let colorValue = getAreaColor(x, y, mosaicSquareDimension, mosaicSquareDimension).value;
            colorMap[x+"-"+y] = {
                "r": colorValue[0],
                "g": colorValue[1],
                "b": colorValue[2]
            }
        }
    }
};

const defineFinalColorMap = () => {
    const keys = Object.keys(colorMap);
};

const getAreaColor = (xCoords, yCoords, frameWidth, frameHeight) => {
    const imageData = context.getImageData(xCoords, yCoords, frameWidth, frameHeight);
    return fac.prepareResult(fac.getColorFromArray4(imageData.data, {}));
};

const getMosaicImageColor = (aImagesPath) => {
    return new Promise((resolve, reject) => {
        const colorPromises = aImagesPath.map((imagePath) => {
            return new Promise((resolve, reject) => {
                getAverageColor(imagePath)
                .then(color => {
                    console.table(color);
                    let imageColors = {};
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

const generateMosaic = (aImagesPath) => {
    return new Promise((resolve, reject) => {
        const imagesToMerge = aImagesPath.map((imagePath, index) => {
            return { src: imagePath, x: index*200, y: 0 }
        })
        mergeImages(imagesToMerge, {
            width: 400,
            height: 200,
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

defineColorMapMosaicImage();

// resizeImage('./imagesIn/in.jpg', {width: 5000, height: 2500});

// const testResized = resizeImage('./images/test.jpg');
// const test1Resized = resizeImage('./images/test1.jpg');

// getMosaicImageColor(testImagesPath)
// .then(() => {
//     Promise.all([
//         testResized,
//         test1Resized
//     ])
//     .then(() => {
        // console.log("Resize success!");
        // generateMosaic(testImagesPath)
        // .then(() => {
        //     console.log("Images merged!");
        // })
        // .catch((err) => {
        //     console.error(err);
        // });
//     })
//     .catch((err) => {
//         console.error(err);
//     });    
// });


