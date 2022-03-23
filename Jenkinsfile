#!/usr/bin/env groovy

def APP_NAME = "com.medallia.zingle.smtpd"
def DOCKER_PREFIX = "virtual-docker.martifactory.io"
def DOCKER_NAME = "medallia/zingle/smtpd"
def VERSION = "${BUILD_ID}"

pipeline {
  agent {
    label "general"
  }

  options {
    ansiColor("xterm")
    timeout(time: 30, unit: "MINUTES")
    buildDiscarder(logRotator(numToKeepStr: "10"))
  }

  tools {
    nodejs "NODEJS16.14.0"
  }

  stages {
    stage("install CI tools") {
      steps {
        sh "/home/jenkins/.local/bin/citools-install.sh"
      }
    }

    stage("run tests") {
      steps {
        sh "npm install"
        sh "npm test"
      }
    }

    stage("build Docker image") {
      steps {
        sh "docker build -t ${DOCKER_PREFIX}/${DOCKER_NAME}:${VERSION} ."
        sh "docker push ${DOCKER_PREFIX}/${DOCKER_NAME}:${VERSION}"
        sh "./ci/citools/bin/citools generateDockerArtifact --dockerVersion ${VERSION} --dockerPath ${DOCKER_NAME}"
      }
    }

    stage("generate manifest") {
      steps {
        sh "./ci/citools/bin/citools generateManifest --appName ${APP_NAME} --appVersion ${VERSION}"
      }
    }
  }

  post {
    always {
      script {
        sh "docker rmi ${DOCKER_PREFIX}/${DOCKER_NAME}:${VERSION} || true"
      }
    }
  }
}
