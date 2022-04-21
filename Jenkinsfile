/**
 * Example Jenkinsfile
 *  https://github.medallia.com/ci-org/gradle-pipeline-tools/blob/master/docs/examples/jenkinsfiles/citools-basic-tasks.jenkinsfile
 */
import groovy.transform.Field

@Field String version
@Field String dockerRepo = 'virtual-docker.martifactory.io'
@Field def citoolsConfigFile

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
    stage('setup') {
         /**
         * 1. Install citools
         * 2. Read JSON config file
         * 3. Calculate the pre version.
         */
        steps {
          script {
            sh "/home/jenkins/.local/bin/citools-install.sh"
            citoolsConfigFile = readJSON file: 'ci/citools-config.json'
            version = sh(script: './ci/citools/bin/citools printPreReleaseVersion', returnStdout: true).trim()
          }
        }
    }

    stage("build") {
      steps {
        sh "npm install"
      }
    }

    stage("unit test") {
      steps {
        sh "npm test"
      }
    }

    stage('publish') {
        steps {
          script {
            for (Map dockerArtifact in citoolsConfigFile.dockerArtifacts) {
              def image = "${dockerRepo}/${dockerArtifact.dockerPath}:${version}"
              sh "docker build -t ${image} ."
              sh "docker push ${image}"
              sh "./ci/citools/bin/citools generateDockerArtifact --dockerVersion ${version} --dockerPath ${dockerArtifact.dockerPath}"
            }
          }
        }
        post {
          always {
            script {
              for (Map dockerArtifact in citoolsConfigFile.dockerArtifacts) {
                def image = "${dockerRepo}/${dockerArtifact.dockerPath}:${version}"
                sh "docker rmi -f ${image}"
              }
            }
          }
        }
    }

    stage('manifest') {
      steps {
        script {
          sh "./ci/citools/bin/citools generateManifest --appName=${citoolsConfigFile.appName} --appVersion=${version}"
          if (isMasterOrRelease(env.BRANCH_NAME)) {
            sh "./ci/citools/bin/citools publishManifest"
            sh "./ci/citools/bin/citools tagManifest --tag committed"
            sh "./ci/citools/bin/citools labelManifest --appVersion=${version} --appName=${citoolsConfigFile.appName} --label='merged,ready-for-regression,ready-for-release'"
          }
        }
      }
    }
  }

  post {
    always {
      script {
        if (fileExists('ci-manifest.json')) {
            archiveArtifacts artifacts: 'ci-manifest.json'
        }
        deleteDir()
      }
    }
  }
}


boolean isMasterOrRelease(branch) {
    return isMaster(branch) || isRelease(branch)
}
boolean isMaster(branch) {
    return branch == 'master'
}
boolean isRelease(branch) {
    return branch ==~ "^v(\\d+)\\.(\\d+)\$"
}

