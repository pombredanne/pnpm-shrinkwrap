import yaml = require('js-yaml')
import mkdirp = require('mkdirp-promise')
import path = require('path')
import rimraf = require('rimraf-then')
import thenify = require('thenify')
import writeFileAtomicCB = require('write-file-atomic')
import {
  CURRENT_SHRINKWRAP_FILENAME,
  WANTED_SHRINKWRAP_FILENAME,
} from './constants'
import logger from './logger'
import {Shrinkwrap} from './types'

const writeFileAtomic = thenify(writeFileAtomicCB)

const SHRINKWRAP_YAML_FORMAT = {
  lineWidth: 1000,
  noCompatMode: true,
  sortKeys: true,
}

export default function write (
  pkgPath: string,
  wantedShrinkwrap: Shrinkwrap,
  currentShrinkwrap: Shrinkwrap,
) {
  const wantedShrinkwrapPath = path.join(pkgPath, WANTED_SHRINKWRAP_FILENAME)
  const currentShrinkwrapPath = path.join(pkgPath, CURRENT_SHRINKWRAP_FILENAME)

  // empty shrinkwrap is not saved
  if (Object.keys(wantedShrinkwrap.specifiers).length === 0) {
    return Promise.all([
      rimraf(wantedShrinkwrapPath),
      rimraf(currentShrinkwrapPath),
    ])
  }

  const yamlDoc = yaml.safeDump(wantedShrinkwrap, SHRINKWRAP_YAML_FORMAT)

  // in most cases the `shrinkwrap.yaml` and `node_modules/.shrinkwrap.yaml` are equal
  // in those cases the YAML document can be stringified only once for both files
  // which is more efficient
  if (wantedShrinkwrap === currentShrinkwrap) {
    return Promise.all([
      writeFileAtomic(wantedShrinkwrapPath, yamlDoc),
      mkdirp(path.dirname(currentShrinkwrapPath)).then(() => writeFileAtomic(currentShrinkwrapPath, yamlDoc)),
    ])
  }

  logger.warn('`shrinkwrap.yaml` differs from `node_modules/.shrinkwrap.yaml`. ' +
    'To fix this, run `pnpm install`. From pnpm version 2, named installations and uninstallations will fail ' +
    'when the content of `node_modules` won\'t match what the `shrinkwrap.yaml` expects.')

  const currentYamlDoc = yaml.safeDump(currentShrinkwrap, SHRINKWRAP_YAML_FORMAT)

  return Promise.all([
    writeFileAtomic(wantedShrinkwrapPath, yamlDoc),
    mkdirp(path.dirname(currentShrinkwrapPath)).then(() => writeFileAtomic(currentShrinkwrapPath, currentYamlDoc)),
  ])
}
