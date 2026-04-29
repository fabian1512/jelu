package io.github.bayang.jelu.utils

import io.github.oshai.kotlinlogging.KotlinLogging
import net.coobird.thumbnailator.Thumbnails
import java.io.File

private val logger = KotlinLogging.logger {}

/**
 * Resizes the original image to max 500×500 and generates two
 * additional thumbnail variants for different display contexts:
 * - [name]-card.ext: 300×450 for book card grids
 * - [name]-thumb.ext: 80×120 for small covers and embeds
 */
fun resizeImage(originalFile: File) {
    val ext = originalFile.extension
    val baseName = originalFile.nameWithoutExtension
    val parentDir = originalFile.parentFile

    try {
        // 1. Original: max 500×500 (same behaviour as before)
        Thumbnails
            .of(originalFile)
            .allowOverwrite(true)
            .useOriginalFormat()
            .size(500, 500)
            .keepAspectRatio(true)
            .toFile(originalFile)

        // 2. Card variant: max 300×450 for book grids (~224px display width)
        Thumbnails
            .of(originalFile)
            .useOriginalFormat()
            .size(300, 450)
            .keepAspectRatio(true)
            .toFile(File(parentDir, "$baseName-card.$ext"))

        // 3. Thumb variant: max 80×120 for small covers and embeds
        Thumbnails
            .of(originalFile)
            .useOriginalFormat()
            .size(80, 120)
            .keepAspectRatio(true)
            .toFile(File(parentDir, "$baseName-thumb.$ext"))
    } catch (e: Exception) {
        logger.error(e) { "Failed to resize image ${originalFile.name}" }
    }
}
