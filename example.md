---
title: Presentation
html-author: myself
html-keywords: rust,fmi
html-description: lecture about something
font-size: 28px
font-family: Arial, Helvetica, sans-serif
# code blocks color theme
theme: github
output: output.html
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

`single code`

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

* item 1
* item 2
  - item 3

```cpp
class A {
  public:
    int counter = 0;
}
```

---

# Image Slide

![img](http://qnimate.com/wp-content/uploads/2014/03/images2.jpg)

---
# Test slide

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
