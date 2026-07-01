<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return redirect('/app/login.html');
});

Route::get('/home', function () {
    return redirect('/app/home.html');
});
