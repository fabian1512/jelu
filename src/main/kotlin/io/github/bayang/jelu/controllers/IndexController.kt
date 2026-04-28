package io.github.bayang.jelu.controllers

import org.springframework.stereotype.Controller
import org.springframework.ui.Model
import org.springframework.web.bind.annotation.GetMapping

@Controller
class IndexController {
    @GetMapping("/")
    fun index(model: Model): String = "/index.html"

    @GetMapping(
        "/books/**",
        "/profile/**",
        "/authors/**",
        "/tags/**",
        "/series/**",
        "/search/**",
        "/reviews/**",
        "/users/**",
        "/add-book/**",
        "/to-read/**",
        "/random/**",
        "/history/**",
        "/custom-lists/**",
        "/login/**",
    )
    fun forwardSpa(): String = "forward:/index.html"
}
