# Automated Pronunciation Evaluation for Korean Language Learners

## Introduction
The Korean Wave has successfully attracted many to the Korean culture, and this can be seen in the rise of number of Korean as a Second Language (L2) learners around the world. Our university is no exception, evident from the steadily increasing enrollment for Korean modules in National University of Singapore (NUS). While providing individual corrective feedback on pronunciation is crucial for language learning, this process is particularly time-consuming for teachers due to the sheer number of students enrolled in the class. Additionally, if multiple examiners are involved in the assessment of students’ pronunciation, it is hard to avoid individual differences (subjectivity) between examiners, leading to more time required for standardisation. Therefore, in this project, we would like to propose a Computer-Assisted Pronunciation Training (CAPT) system for Korean L2 learners in NUS. The system aims to not only help ease the workload of Korean language teachers in NUS, but to also provide students with individualised feedback on their pronunciation based on various relevant features for pronunciation assessment such as Goodness of Pronunciation (GOP).

## Objectives
Our project has two main objectives:
1. To provide regular and personalised feedback to **Korean L2 learners** with the help of Automatic Speech Recognition (ASR) and machine learning algorithms.
2. To alleviate the burden of **language teachers** in grading students’ pronunciation by automating the evaluation process and providing an objective machine score that is as close to human evaluation score as possible.

## Target Audience
Current and future students of NUS Korean 1 modules.

# Deploy to School Server

## Overview
The Flask server is served on an SoC virtual machine, which can be accessed using a reverse proxy set up by the faculty. If either the virtual machine or the reverse proxy is down, the school's technical service should be able to help.

## Starting the Server
1. Connect to the virtual machine via SSH. You should be connected to either NUS VPN or SoC VPN. Obtain the credentials from the developer.
2. Check if any screen has been started using `screen ls`.
3. If no screen has been created, create a new screen named server using `screen -S server`. If there is an existing screen, you could close all screen using `pkill screen`.
4. Within this screen, navigate to the correct Flask directory.
5. Activate the conda environment using `source activate cs4347`.
6. Run the necessary environment setup using `source .env`.
7. Finally, run the Flask server on port 80 using `authbind --deep python manage.py runserver`.

Note: End the screen using <kbd>Ctrl</kbd>+<kbd>C</kbd>, Exit the screen while still running it in the background using <kbd>Ctrl</kbd>+<kbd>A</kbd>+<kbd>D</kbd>.
