package org.com.modules.user.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController("userController")
@RequestMapping("/account")
public class UserController {

    @PostMapping("/login")
    public String login(){
        return "success";
    }
}
