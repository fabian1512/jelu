package io.github.bayang.jelu.dto

data class MetadataProviderSettingDto(
    val name: String,
    val isEnabled: Boolean,
    val order: Int,
    val apiKey: String? = null,
    val config: String? = null,
)

data class MetadataProviderSettingsUpdateDto(
    val providers: List<MetadataProviderSettingDto>,
)
