---
title: Presentation
author: myself
lang: en
keywords: rust,fmi
description: lecture about stuff
slide-width: 50%
font-size: 20px
font-family: Arial, Helvetica, sans-serif
# code blocks color theme
theme: github
outputDir: output
---

# Introduction

### Basics

This is how to implement the following formulae in Rust

$$
x=\frac{ -b\pm\sqrt{ b^2-4ac } } {2a}
$$

```rust
fn solve(a: f64, b: f64, c: f64) -> (f64, f64) {
    let d = f64::sqrt(b*b - 4.*a*c);
    ((-b+d)/(2.*a), (-b-d)/(2.*a))
}

fn main() {
    let (x1, x2) = solve(1., 2., 1.);
    println!("x1 = {}, x2 = {}", x1, x2);
}
```

---

# Slide 2

### Errors and warnings

```rust
# // norun
struct A {
    a: u32,
    b: Vec<Box<Iterator<Item=u8>>>
}
# fn main() {}
```

```rust
# // norun
# fn main() {
let a = "string";

let b: String = a;
# }
```

---

# Slide 3

### Animations

* item 1
--
* item 2
--
  - item 3
--

%%
```rust
# // ignore
struct A {
    pub counter: i32;
}
```
%%
--
```cpp
class A {
  public:
    int counter;
}
```
%%

---

# Image Slide

![img](http://qnimate.com/wp-content/uploads/2014/03/images2.jpg)

---

# Rust error slide

```rust
# // norun
fn solve(a: f64, b: f64, c: f64) -> (f64, f64) {
    let d = f64::sqrt(b*b - 4.*a*c);
    ((-b+d)/(2.*a), (-b-d)/(2.*a));
}

fn main() {
    let (x1, x2) = solve(1., 2., 1.);
    println!("x1 = {}, x2 = {}", x1, x2);
}
```

---

# Tables

### Markdown table centered

| Header1 | Header2  |
|:-------:|:--------:|
|   u8    |   char   |
|   u32   | unsigned |

---

# Advanced tables 1

%%
### HTML table

<table>
    <thead>
        <tr><th>Header1</th><th>Header2</th></tr>
    </thead>
    <tbody>
        <tr><td>1</td><td>2</td></tr>
    </tbody>
</table>

```html
<table>
    <thead>
        <tr>
            <th>Header1</th>
            <th>Header2</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>1</td>
            <td>2</td>
        </tr>
    </tbody>
</table>
```
%%
### Complex table syntax

@@table
h1 h2
@
c1 c2
@@
"h1": "Header1",
"h2": "Header2",
"c1": "1",
"c2": "2"
@@end

```md
@@table
h1 h2
@
c1 c2
@@
"h1": "Header1",
"h2": "Header2",
"c1": "1",
"c2": "2"
@@end-np
```
%%

---

# Advanced tables 2

### First

@@table
header1 header1 header2
@
content1 content1 content2
content1 content1 content3
@@
"header1": {
    "text": "...",
    "style": "color: red"
},
"header2": "...",
"content1": "...",
"content2": "...",
"content3": "..."
@@end

### Second

@@table
header header header
@
content1 content1 content2
content5 content9 content4
content5 content6 content6
@@
@@end

### Third

@@table
header1 header2 header2
@
content1 content1 content1
content3 content9 content2
content4 content1 content1
@@
"content1": "..."
@@end
