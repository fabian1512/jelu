package io.github.bayang.jelu.utils

fun imageName(
    title: String,
    bookId: String,
    extension: String,
): String {
    val ext = extension.ifBlank { "jpg" }
    return "$title-$bookId.$ext"
}
