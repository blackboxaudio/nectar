# `@bbx-audio/nectar`

[![@bbx-audio/nectar: v0.1.7](https://img.shields.io/badge/npm-v0.1.7-blue.svg)](https://github.com/blackboxaudio/nectar)
[![Build](https://github.com/blackboxaudio/nectar/actions/workflows/ci.build.yml/badge.svg)](https://github.com/blackboxaudio/nectar/actions/workflows/ci.build.yml)

> A JUCE-y module for building web-based plugin GUIs 🍯

## Overview

This library is a wrapper around the [JUCE javascript code](https://github.com/juce-framework/JUCE/tree/master/modules/juce_gui_extra/native/javascript) that 
is used for building WebView-based GUIs. 

It adds quickly generated TypeScript declaration files so that the JUCE functionality can be used
in a TypeScript-based project.

## Usage

As a prerequisite, make sure you have an `.npmrc` file configured with the correct access tokens for NPM.

Once complete, simply install the dependency as any other:
```bash
# NPM
npm i @bbx-audio/nectar

# Yarn
yarn add @bbx-audio/nectar
```
