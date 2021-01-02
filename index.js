"use strict";

import { getAverageColor } from 'fast-average-color-node';
import mergeImages  from 'merge-images';
import fs from "fs";
import canvas from 'canvas';
import sizeOf from 'image-size';
import sharp from 'sharp';
const { Canvas, Image } = canvas;

const resizeImage = (imagePath) => {
    return new Promise((resolve, reject) => {
        sharp(imagePath)
        .resize({ width: 50, height: 50 })
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
            fs.writeFile("./out.jpg", base64String, 'base64', function(err) {
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
}

const testResized = resizeImage('./images/test.jpg');
const test1Resized = resizeImage('./images/test1.jpg');

Promise.all([
    testResized,
    test1Resized
])
.then(() => {
    console.log("Resize success!");
    generateMosaic(['./images/test.jpg', './images/test1.jpg'])
    .then(() => {
        console.log("Images merged!");
    })
    .catch((err) => {
        console.error(err);
    })
})
.catch((err) => {
    console.error(err);
});

// getAverageColor('./images/test.jpg').then(color => {
//     console.log(color);
// });



