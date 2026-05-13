package io.github.bayang.jelu.controllers

import io.github.bayang.jelu.dto.MetadataProviderSettingsUpdateDto
import io.github.bayang.jelu.dto.assertIsJeluUser
import io.github.bayang.jelu.service.metadata.PluginInfoHolder
import jakarta.validation.Valid
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1")
class MetadataProviderSettingsController(
    private val pluginInfoHolder: PluginInfoHolder,
) {
    @GetMapping(path = ["/metadata-providers"])
    fun getProviderSettings() = pluginInfoHolder.getProviderSettings()

    @PutMapping(path = ["/metadata-providers"])
    fun updateProviderSettings(
        @RequestBody @Valid
        update: MetadataProviderSettingsUpdateDto,
        principal: Authentication,
    ): ResponseEntity<Unit> {
        assertIsJeluUser(principal.principal)
        pluginInfoHolder.updateProviderSettings(update.providers)
        return ResponseEntity.noContent().build()
    }
}
