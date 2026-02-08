import fs from "fs"

/*
* This function is used to convert an image to base64
* @param filePath - The path to the image
* @returns The base64 representation of the image
* 
* Note: Only works on png
*/

export const toBase64 = async (filePath: string) => {
    const bitmap = fs.readFileSync(filePath)
    return `data:image/png;base64,${bitmap.toString('base64')}`
}