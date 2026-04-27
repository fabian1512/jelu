package io.github.bayang.jelu.config

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpMethod
import org.springframework.http.client.SimpleClientHttpRequestFactory
import org.springframework.http.client.reactive.ReactorClientHttpConnector
import org.springframework.http.codec.ClientCodecConfigurer
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import org.springframework.web.client.RestClient
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.UrlBasedCorsConfigurationSource
import org.springframework.web.reactive.function.client.ExchangeStrategies
import org.springframework.web.reactive.function.client.WebClient
import reactor.netty.http.client.HttpClient
import java.time.Duration

const val SESSION_HEADER_NAME: String = "X-Auth-Token"

@Configuration
class GlobalConfig {
    @Bean("restClient")
    fun webClient(): WebClient {
        val exchange =
            ExchangeStrategies
                .builder()
                .codecs { c: ClientCodecConfigurer ->
                    c.defaultCodecs().maxInMemorySize(16 * 1024 * 1024)
                }.build()
        return WebClient
            .builder()
            .exchangeStrategies(exchange)
            .clientConnector(
                ReactorClientHttpConnector(
                    HttpClient.create().compress(true).followRedirect(true),
                ),
            ).build()
    }

    @Bean("springRestClient")
    fun springRestClient(): RestClient {
        val factory = SimpleClientHttpRequestFactory()
        factory.connectTimeout = Duration.ofSeconds(10)
        factory.readTimeout = Duration.ofSeconds(15)
        return RestClient.builder().requestFactory(factory).build()
    }

    @Bean("passwordEncoder")
    fun passwordEncoder(): PasswordEncoder = BCryptPasswordEncoder()

    @Bean
    fun corsConfigurationSource(jeluProperties: JeluProperties): UrlBasedCorsConfigurationSource =
        UrlBasedCorsConfigurationSource().apply {
            registerCorsConfiguration(
                "/**",
                CorsConfiguration().applyPermitDefaultValues().apply {
                    allowedOriginPatterns =
                        if (jeluProperties.cors.allowedOrigins.isNullOrEmpty()) listOf("*") else jeluProperties.cors.allowedOrigins
                    allowedMethods = HttpMethod.values().map { it.name() }
                    allowCredentials = true
                    addAllowedHeader(HttpHeaders.AUTHORIZATION)
                    addExposedHeader(HttpHeaders.CONTENT_DISPOSITION)
                    addExposedHeader(SESSION_HEADER_NAME)
                    addExposedHeader(HttpHeaders.AUTHORIZATION)
                },
            )
        }
}
