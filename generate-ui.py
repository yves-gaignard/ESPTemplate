#
# Pre-build procedure to generate automatically the web ui of esp32 manager
#

# Import the current working construction
# environment to the `env` variable.
# alias of `env = DefaultEnvironment()`
Import ("env")

# print(env.Dump())                                    # Dump construction environment (for debug purpose)
# print('PROJECT_BUILD_DIR :',env['PROJECT_BUILD_DIR'])  # Print the content of a variable

# importing python modules
import os, subprocess
    
# Create the directory web-ui
project_dir       = env['PROJECT_DIR']
# print('project_dir      : ',project_dir)
project_src_dir   = env['PROJECT_SRC_DIR']
# print('project_src_dir  : ',project_src_dir)
project_build_dir = env['PROJECT_BUILD_DIR']
# print('project_build_dir: ',project_build_dir)

# Create the directory web-ui
#web_ui_build_dir = project_build_dir+'/web-ui'
web_ui_build_dir = project_build_dir

if not os.path.isdir(web_ui_build_dir):
  # directory does not exists
  print('Directory does not exist, must be created:',web_ui_build_dir)
  try: 
      os.mkdir(web_ui_build_dir) 
  except OSError as error: 
      print(error)  
else:
  print('Directory already exist:',web_ui_build_dir)

# Run the other build-ui delivered in esp32m
subprocess.call(["python", project_dir+'/lib/esp32m/scripts/build-ui.py', 
                '--esp32m-dir='+project_dir+'/lib/esp32m',
                '--source-dir='+project_dir+'/lib',
                '--build-dir='+web_ui_build_dir],
                cwd=web_ui_build_dir)


# DefaultEnvironment() :
# 'PROJECT_BUILD_DIR': 'E:\\users\\ygd\\Projets\\PlatformIO\\ESPTemplate\\.pio\\build',
# 'PROJECT_CONFIG': 'E:\\users\\ygd\\Projets\\PlatformIO\\ESPTemplate\\platformio.ini',
# 'PROJECT_CORE_DIR': 'C:\\Users\\ygd\\.platformio',
# 'PROJECT_DATA_DIR': 'E:\\users\\ygd\\Projets\\PlatformIO\\ESPTemplate\\data',
# 'PROJECT_DIR': 'E:\\users\\ygd\\Projets\\PlatformIO\\ESPTemplate',
# 'PROJECT_INCLUDE_DIR': 'E:\\users\\ygd\\Projets\\PlatformIO\\ESPTemplate\\include',
# 'PROJECT_LIBDEPS_DIR': 'E:\\users\\ygd\\Projets\\PlatformIO\\ESPTemplate\\.pio\\libdeps',
# 'PROJECT_PACKAGES_DIR': 'C:\\Users\\ygd\\.platformio\\packages',
# 'PROJECT_SRC_DIR': 'E:\\users\\ygd\\Projets\\PlatformIO\\ESPTemplate\\src',
# 'PROJECT_TEST_DIR': 'E:\\users\\ygd\\Projets\\PlatformIO\\ESPTemplate\\test',
# 'PROJECT_WORKSPACE_DIR': 'E:\\users\\ygd\\Projets\\PlatformIO\\ESPTemplate\\.pio',
